import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchShopMe,
  updateShopCatalog,
  addShopAddon,
  deleteShopAddon,
  fetchShopCatalog,
  fetchDailyLedger,
  fetchLedgerHistory,
  updateLedgerPayment,
} from "@/lib/api";

export interface AddonItem {
  id: string;
  name: string;
  type: string;
  price: string;
}

export interface CatalogState {
  isBwEnabled: boolean;
  bwSinglePrice: string;
  bwDoublePrice: string;
  isColorEnabled: boolean;
  colorSinglePrice: string;
  colorDoublePrice: string;
  isDuplexEnabled: boolean;
  addons: AddonItem[];
  ledgerData: {
    totalRevenue: number;
    cashCollected: number;
    upiCollected: number;
    totalJobsCompleted: number;
    totalPagesPrinted: number;
    bwPagesPrinted: number;
    colorPagesPrinted: number;
  } | null;
  historyJobs: any[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: CatalogState = {
  isBwEnabled: true,
  bwSinglePrice: "2.00",
  bwDoublePrice: "1.50",
  isColorEnabled: false,
  colorSinglePrice: "10.00",
  colorDoublePrice: "8.00",
  isDuplexEnabled: true,
  addons: [],
  ledgerData: null,
  historyJobs: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export const fetchCatalogSettings = createAsyncThunk(
  "catalog/fetchSettings",
  async (token: string, { rejectWithValue }) => {
    try {
      const meRes = await fetchShopMe(token);
      const s = meRes.data.settings;
      const shop = meRes.data.shop;

      let addons: AddonItem[] = [];
      if (shop?.slug) {
        try {
          const catRes = await fetchShopCatalog(shop.slug);
          addons = catRes.data.catalog.addons || [];
        } catch {}
      }

      return { settings: s, addons };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load catalog settings");
    }
  }
);

export const saveCatalogSettings = createAsyncThunk(
  "catalog/saveSettings",
  async (
    {
      token,
      settings,
    }: {
      token: string;
      settings: {
        isBwEnabled: boolean;
        bwSinglePrice: number;
        bwDoublePrice: number;
        isColorEnabled: boolean;
        colorSinglePrice: number;
        colorDoublePrice: number;
        isDuplexEnabled: boolean;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateShopCatalog(token, settings);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update catalog settings");
    }
  }
);

export const createAddon = createAsyncThunk(
  "catalog/createAddon",
  async (
    {
      token,
      name,
      price,
      type = "CUSTOM",
    }: {
      token: string;
      name: string;
      price: number;
      type?: "BINDING" | "LAMINATION" | "STAPLING" | "CUSTOM";
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await addShopAddon(token, { name, price, type });
      return res.data as AddonItem;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to add service");
    }
  }
);

export const removeAddon = createAsyncThunk(
  "catalog/removeAddon",
  async ({ token, id }: { token: string; id: string }, { rejectWithValue }) => {
    try {
      await deleteShopAddon(token, id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to remove service");
    }
  }
);

export const fetchLedgerStats = createAsyncThunk(
  "catalog/fetchLedger",
  async (token: string, { rejectWithValue }) => {
    try {
      const [dailyRes, historyRes] = await Promise.all([
        fetchDailyLedger(token),
        fetchLedgerHistory(token, 30),
      ]);
      return {
        ledger: dailyRes.data.summary,
        history: historyRes.data.jobs,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load daily ledger");
    }
  }
);

export const toggleJobPayment = createAsyncThunk(
  "catalog/togglePayment",
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
      const newStatus =
        currentStatus === "PAID_UPI" ? "PAID_CASH" : "PAID_UPI";
      await updateLedgerPayment(token, jobId, newStatus);
      return { jobId, newStatus };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle payment status");
    }
  }
);

export const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    setBwEnabled: (state, action: PayloadAction<boolean>) => {
      state.isBwEnabled = action.payload;
    },
    setBwSinglePrice: (state, action: PayloadAction<string>) => {
      state.bwSinglePrice = action.payload;
    },
    setBwDoublePrice: (state, action: PayloadAction<string>) => {
      state.bwDoublePrice = action.payload;
    },
    setColorEnabled: (state, action: PayloadAction<boolean>) => {
      state.isColorEnabled = action.payload;
    },
    setColorSinglePrice: (state, action: PayloadAction<string>) => {
      state.colorSinglePrice = action.payload;
    },
    setColorDoublePrice: (state, action: PayloadAction<string>) => {
      state.colorDoublePrice = action.payload;
    },
    setDuplexEnabled: (state, action: PayloadAction<boolean>) => {
      state.isDuplexEnabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Catalog Settings
      .addCase(fetchCatalogSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCatalogSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.settings) {
          const s = action.payload.settings;
          state.isBwEnabled = s.isBwEnabled;
          state.bwSinglePrice = s.bwSinglePrice;
          state.bwDoublePrice = s.bwDoublePrice;
          state.isColorEnabled = s.isColorEnabled;
          state.colorSinglePrice = s.colorSinglePrice;
          state.colorDoublePrice = s.colorDoublePrice;
          state.isDuplexEnabled = s.isDuplexEnabled;
        }
        state.addons = action.payload.addons;
      })
      .addCase(fetchCatalogSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Save Catalog Settings
      .addCase(saveCatalogSettings.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(saveCatalogSettings.fulfilled, (state, action) => {
        state.isSaving = false;
        if (action.payload) {
          state.isBwEnabled = action.payload.isBwEnabled;
          state.bwSinglePrice = action.payload.bwSinglePrice;
          state.bwDoublePrice = action.payload.bwDoublePrice;
          state.isColorEnabled = action.payload.isColorEnabled;
          state.colorSinglePrice = action.payload.colorSinglePrice;
          state.colorDoublePrice = action.payload.colorDoublePrice;
          state.isDuplexEnabled = action.payload.isDuplexEnabled;
        }
      })
      .addCase(saveCatalogSettings.rejected, (state) => {
        state.isSaving = false;
      })
      // Add Addon
      .addCase(createAddon.fulfilled, (state, action) => {
        state.addons.push(action.payload);
      })
      // Remove Addon
      .addCase(removeAddon.fulfilled, (state, action) => {
        state.addons = state.addons.filter((a) => a.id !== action.payload);
      })
      // Fetch Ledger
      .addCase(fetchLedgerStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLedgerStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.ledgerData = action.payload.ledger;
        state.historyJobs = action.payload.history;
      })
      .addCase(fetchLedgerStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Toggle Payment
      .addCase(toggleJobPayment.fulfilled, (state, action) => {
        const target = state.historyJobs.find(
          (j) => j.id === action.payload.jobId
        );
        if (target) {
          target.paymentStatus = action.payload.newStatus;
        }
      });
  },
});

export const {
  setBwEnabled,
  setBwSinglePrice,
  setBwDoublePrice,
  setColorEnabled,
  setColorSinglePrice,
  setColorDoublePrice,
  setDuplexEnabled,
} = catalogSlice.actions;

export default catalogSlice.reducer;
