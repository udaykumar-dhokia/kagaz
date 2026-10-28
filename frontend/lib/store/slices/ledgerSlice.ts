import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchLedgerAnalytics,
  fetchFilteredLedgerHistory,
  updateLedgerPayment,
  type LedgerAnalyticsResponse,
  type EnrichedHistoryJob,
} from "@/lib/api";

export type LedgerRange = "today" | "yesterday" | "7d" | "30d" | "custom";
export type PaymentFilter = "ALL" | "PAID_CASH" | "PAID_UPI" | "UNPAID";
export type SortOption = "recent" | "amount_desc" | "amount_asc";

export interface LedgerFilters {
  range: LedgerRange;
  startDate: string;
  endDate: string;
  paymentStatus: PaymentFilter;
  searchQuery: string;
  sortBy: SortOption;
  page: number;
  limit: number;
}

export interface LedgerState {
  filters: LedgerFilters;
  analytics: LedgerAnalyticsResponse["data"] | null;
  historyJobs: EnrichedHistoryJob[];
  totalHistoryCount: number;
  isLoadingAnalytics: boolean;
  isLoadingHistory: boolean;
  isUpdatingPayment: boolean;
  errorMessage: string | null;
}

const initialState: LedgerState = {
  filters: {
    range: "today",
    startDate: "",
    endDate: "",
    paymentStatus: "ALL",
    searchQuery: "",
    sortBy: "recent",
    page: 1,
    limit: 15,
  },
  analytics: null,
  historyJobs: [],
  totalHistoryCount: 0,
  isLoadingAnalytics: false,
  isLoadingHistory: false,
  isUpdatingPayment: false,
  errorMessage: null,
};

export const fetchLedgerAnalyticsThunk = createAsyncThunk(
  "ledger/fetchAnalytics",
  async ({ token }: { token: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { ledger: LedgerState };
      const { range, startDate, endDate, paymentStatus } = state.ledger.filters;

      const res = await fetchLedgerAnalytics(token, {
        range,
        startDate: range === "custom" ? startDate : undefined,
        endDate: range === "custom" ? endDate : undefined,
        paymentStatus,
      });

      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load analytics");
    }
  }
);

export const fetchLedgerHistoryThunk = createAsyncThunk(
  "ledger/fetchHistory",
  async ({ token }: { token: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { ledger: LedgerState };
      const { range, startDate, endDate, paymentStatus, searchQuery, sortBy, page, limit } =
        state.ledger.filters;

      const offset = (page - 1) * limit;

      const res = await fetchFilteredLedgerHistory(token, {
        range,
        startDate: range === "custom" ? startDate : undefined,
        endDate: range === "custom" ? endDate : undefined,
        paymentStatus,
        search: searchQuery || undefined,
        sortBy,
        limit,
        offset,
      });

      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load history");
    }
  }
);

export const toggleJobPaymentThunk = createAsyncThunk(
  "ledger/togglePayment",
  async (
    {
      token,
      jobId,
      currentStatus,
    }: {
      token: string;
      jobId: string;
      currentStatus: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const newStatus = currentStatus === "PAID_CASH" ? "PAID_UPI" : "PAID_CASH";
      await updateLedgerPayment(token, jobId, newStatus);
      return { jobId, newStatus };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle payment");
    }
  }
);

export const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {
    setRange: (state, action: PayloadAction<LedgerRange>) => {
      state.filters.range = action.payload;
      state.filters.page = 1;
    },
    setCustomDates: (
      state,
      action: PayloadAction<{ startDate: string; endDate: string }>
    ) => {
      state.filters.startDate = action.payload.startDate;
      state.filters.endDate = action.payload.endDate;
      state.filters.range = "custom";
      state.filters.page = 1;
    },
    setPaymentStatus: (state, action: PayloadAction<PaymentFilter>) => {
      state.filters.paymentStatus = action.payload;
      state.filters.page = 1;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.filters.searchQuery = action.payload;
      state.filters.page = 1;
    },
    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.filters.sortBy = action.payload;
      state.filters.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.filters.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.filters.limit = action.payload;
      state.filters.page = 1;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    // 1. Analytics
    builder
      .addCase(fetchLedgerAnalyticsThunk.pending, (state) => {
        state.isLoadingAnalytics = true;
        state.errorMessage = null;
      })
      .addCase(fetchLedgerAnalyticsThunk.fulfilled, (state, action) => {
        state.isLoadingAnalytics = false;
        state.analytics = action.payload;
      })
      .addCase(fetchLedgerAnalyticsThunk.rejected, (state, action) => {
        state.isLoadingAnalytics = false;
        state.errorMessage = action.payload as string;
      });

    // 2. History
    builder
      .addCase(fetchLedgerHistoryThunk.pending, (state) => {
        state.isLoadingHistory = true;
      })
      .addCase(fetchLedgerHistoryThunk.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.historyJobs = action.payload.jobs;
        state.totalHistoryCount = action.payload.pagination.totalCount;
      })
      .addCase(fetchLedgerHistoryThunk.rejected, (state) => {
        state.isLoadingHistory = false;
      });

    // 3. Payment Toggle
    builder
      .addCase(toggleJobPaymentThunk.pending, (state) => {
        state.isUpdatingPayment = true;
      })
      .addCase(toggleJobPaymentThunk.fulfilled, (state, action) => {
        state.isUpdatingPayment = false;
        const job = state.historyJobs.find((j) => j.id === action.payload.jobId);
        if (job) {
          const oldStatus = job.paymentStatus;
          job.paymentStatus = action.payload.newStatus;

          // Adjust in-memory analytics summary immediately
          if (state.analytics?.summary) {
            const amount = Number(job.totalAmount);
            if (oldStatus === "PAID_CASH" && action.payload.newStatus === "PAID_UPI") {
              state.analytics.summary.cashCollected = Math.max(0, state.analytics.summary.cashCollected - amount);
              state.analytics.summary.upiCollected += amount;
            } else if (oldStatus === "PAID_UPI" && action.payload.newStatus === "PAID_CASH") {
              state.analytics.summary.upiCollected = Math.max(0, state.analytics.summary.upiCollected - amount);
              state.analytics.summary.cashCollected += amount;
            }
          }
        }
      })
      .addCase(toggleJobPaymentThunk.rejected, (state) => {
        state.isUpdatingPayment = false;
      });
  },
});

export const {
  setRange,
  setCustomDates,
  setPaymentStatus,
  setSearchQuery,
  setSortBy,
  setPage,
  setLimit,
  resetFilters,
} = ledgerSlice.actions;

export default ledgerSlice.reducer;
