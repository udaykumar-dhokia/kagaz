import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchShopQueue,
  verifyQueuePin,
  completeQueueJob,
  cancelQueueJob,
  type QueueJob,
} from "@/lib/api";

export interface QueueState {
  jobs: QueueJob[];
  selectedJob: QueueJob | null;
  isModalOpen: boolean;
  isSearchingPin: boolean;
  isAudioMuted: boolean;
  isSocketConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: QueueState = {
  jobs: [],
  selectedJob: null,
  isModalOpen: false,
  isSearchingPin: false,
  isAudioMuted: false,
  isSocketConnected: false,
  isLoading: false,
  error: null,
};

export const fetchQueue = createAsyncThunk(
  "queue/fetchQueue",
  async (token: string, { rejectWithValue }) => {
    try {
      const res = await fetchShopQueue(token);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch counter queue");
    }
  }
);

export const searchQueuePin = createAsyncThunk(
  "queue/searchPin",
  async ({ token, pin }: { token: string; pin: string }, { rejectWithValue }) => {
    try {
      const res = await verifyQueuePin(token, pin);
      const verifiedJob: QueueJob = {
        ...res.data.job,
        items: res.data.items,
      };
      return verifiedJob;
    } catch (err: any) {
      return rejectWithValue(err.message || `No active job found for pin "${pin}"`);
    }
  }
);

export const completeJob = createAsyncThunk(
  "queue/completeJob",
  async (
    {
      token,
      jobId,
      paymentStatus = "PAID_CASH",
    }: {
      token: string;
      jobId: string;
      paymentStatus?: "PAID_CASH" | "PAID_UPI";
    },
    { rejectWithValue }
  ) => {
    try {
      await completeQueueJob(token, jobId, paymentStatus);
      return jobId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to complete job");
    }
  }
);

export const cancelJob = createAsyncThunk(
  "queue/cancelJob",
  async ({ token, jobId }: { token: string; jobId: string }, { rejectWithValue }) => {
    try {
      await cancelQueueJob(token, jobId);
      return jobId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to cancel job");
    }
  }
);

export const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<QueueJob[]>) => {
      state.jobs = action.payload;
    },
    openJobModal: (state, action: PayloadAction<QueueJob>) => {
      state.selectedJob = action.payload;
      state.isModalOpen = true;
    },
    closeJobModal: (state) => {
      state.isModalOpen = false;
      state.selectedJob = null;
    },
    toggleAudioMute: (state) => {
      state.isAudioMuted = !state.isAudioMuted;
    },
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.isSocketConnected = action.payload;
    },
    // WebSocket Event Reducers
    onJobCreated: (state, action: PayloadAction<any>) => {
      // If full job is passed or partial
      const exists = state.jobs.some((j) => j.id === action.payload.jobId);
      if (!exists && action.payload.id) {
        state.jobs.unshift(action.payload);
      }
    },
    onJobStatusUpdated: (
      state,
      action: PayloadAction<{ jobId: string; status: QueueJob["status"] }>
    ) => {
      const idx = state.jobs.findIndex((j) => j.id === action.payload.jobId);
      if (idx !== -1) {
        state.jobs[idx].status = action.payload.status;
      }
      if (state.selectedJob?.id === action.payload.jobId) {
        state.selectedJob.status = action.payload.status;
      }
    },
    onJobCompleted: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((j) => j.id !== action.payload);
      if (state.selectedJob?.id === action.payload) {
        state.isModalOpen = false;
        state.selectedJob = null;
      }
    },
    onJobCancelled: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter((j) => j.id !== action.payload);
      if (state.selectedJob?.id === action.payload) {
        state.isModalOpen = false;
        state.selectedJob = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch queue
      .addCase(fetchQueue.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchQueue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Search PIN
      .addCase(searchQueuePin.pending, (state) => {
        state.isSearchingPin = true;
      })
      .addCase(searchQueuePin.fulfilled, (state, action) => {
        state.isSearchingPin = false;
        state.selectedJob = action.payload;
        state.isModalOpen = true;
      })
      .addCase(searchQueuePin.rejected, (state, action) => {
        state.isSearchingPin = false;
        state.error = action.payload as string;
      })
      // Complete job
      .addCase(completeJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter((j) => j.id !== action.payload);
        if (state.selectedJob?.id === action.payload) {
          state.isModalOpen = false;
          state.selectedJob = null;
        }
      })
      // Cancel job
      .addCase(cancelJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter((j) => j.id !== action.payload);
        if (state.selectedJob?.id === action.payload) {
          state.isModalOpen = false;
          state.selectedJob = null;
        }
      });
  },
});

export const {
  setJobs,
  openJobModal,
  closeJobModal,
  toggleAudioMute,
  setSocketConnected,
  onJobCreated,
  onJobStatusUpdated,
  onJobCompleted,
  onJobCancelled,
} = queueSlice.actions;

export default queueSlice.reducer;

