import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchShopCatalog,
  submitPrintOrder,
  type ShopCatalogResponse,
  type CreateOrderPayload,
  type CreateOrderResponse,
} from "@/lib/api";

export interface PendingDoc {
  fileKey: string;
  filename: string;
  pageCount: number;
  paperSize: string;
  sizeBytes: number;
}

export interface CustomerState {
  shopSlug: string | null;
  shopData: ShopCatalogResponse["data"] | null;
  pendingDoc: PendingDoc | null;
  uploadStatus: "idle" | "uploading" | "inspecting" | "ready" | "error";
  uploadProgress: number;
  errorMessage: string | null;
  pageSelection: "all" | "custom";
  customPageRange: string;
  colorMode: "BW" | "COLOR";
  isDuplex: boolean;
  copies: number;
  selectedAddonIds: string[];
  customerPhone: string;
  activeRecoveryJob: {
    id: string;
    pickupPin: string;
    status: string;
    totalAmount: string;
  } | null;
  isLoading: boolean;
  isSubmittingOrder: boolean;
}

const initialState: CustomerState = {
  shopSlug: null,
  shopData: null,
  pendingDoc: null,
  uploadStatus: "idle",
  uploadProgress: 0,
  errorMessage: null,
  pageSelection: "all",
  customPageRange: "",
  colorMode: "BW",
  isDuplex: false,
  copies: 1,
  selectedAddonIds: [],
  customerPhone: "",
  activeRecoveryJob: null,
  isLoading: false,
  isSubmittingOrder: false,
};

export const loadShopCatalog = createAsyncThunk(
  "customer/loadShopCatalog",
  async (slug: string, { rejectWithValue }) => {
    try {
      const res = await fetchShopCatalog(slug);
      return { slug, data: res.data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load shop catalog");
    }
  }
);

export const submitCustomerOrder = createAsyncThunk(
  "customer/submitOrder",
  async (payload: CreateOrderPayload, { rejectWithValue }) => {
    try {
      const res = await submitPrintOrder(payload);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create print order");
    }
  }
);

export const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    setShopSlug: (state, action: PayloadAction<string>) => {
      state.shopSlug = action.payload;
    },
    setPendingDoc: (state, action: PayloadAction<PendingDoc | null>) => {
      state.pendingDoc = action.payload;
      if (action.payload) {
        state.uploadStatus = "ready";
        state.errorMessage = null;
      } else {
        state.uploadStatus = "idle";
      }
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    setUploadStatus: (
      state,
      action: PayloadAction<CustomerState["uploadStatus"]>
    ) => {
      state.uploadStatus = action.payload;
    },
    setUploadError: (state, action: PayloadAction<string>) => {
      state.uploadStatus = "error";
      state.errorMessage = action.payload;
    },
    setColorMode: (state, action: PayloadAction<"BW" | "COLOR">) => {
      state.colorMode = action.payload;
    },
    setIsDuplex: (state, action: PayloadAction<boolean>) => {
      state.isDuplex = action.payload;
    },
    setCopies: (state, action: PayloadAction<number>) => {
      state.copies = Math.max(1, Math.min(99, action.payload));
    },
    setPageSelection: (state, action: PayloadAction<"all" | "custom">) => {
      state.pageSelection = action.payload;
    },
    setCustomPageRange: (state, action: PayloadAction<string>) => {
      state.customPageRange = action.payload;
    },
    toggleAddonId: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.selectedAddonIds.includes(id)) {
        state.selectedAddonIds = state.selectedAddonIds.filter(
          (item) => item !== id
        );
      } else {
        state.selectedAddonIds.push(id);
      }
    },
    setCustomerPhone: (state, action: PayloadAction<string>) => {
      state.customerPhone = action.payload;
    },
    setActiveRecoveryJob: (
      state,
      action: PayloadAction<CustomerState["activeRecoveryJob"]>
    ) => {
      state.activeRecoveryJob = action.payload;
    },
    clearPendingDoc: (state) => {
      state.pendingDoc = null;
      state.uploadStatus = "idle";
      state.uploadProgress = 0;
      state.errorMessage = null;
      state.customPageRange = "";
      state.pageSelection = "all";
      state.selectedAddonIds = [];
      state.copies = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadShopCatalog.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadShopCatalog.fulfilled, (state, action) => {
        state.isLoading = false;
        state.shopSlug = action.payload.slug;
        state.shopData = action.payload.data;
      })
      .addCase(loadShopCatalog.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(submitCustomerOrder.pending, (state) => {
        state.isSubmittingOrder = true;
      })
      .addCase(submitCustomerOrder.fulfilled, (state) => {
        state.isSubmittingOrder = false;
        state.pendingDoc = null;
        state.uploadStatus = "idle";
      })
      .addCase(submitCustomerOrder.rejected, (state) => {
        state.isSubmittingOrder = false;
      });
  },
});

export const {
  setShopSlug,
  setPendingDoc,
  setUploadProgress,
  setUploadStatus,
  setUploadError,
  setColorMode,
  setIsDuplex,
  setCopies,
  setPageSelection,
  setCustomPageRange,
  toggleAddonId,
  setCustomerPhone,
  setActiveRecoveryJob,
  clearPendingDoc,
} = customerSlice.actions;

export default customerSlice.reducer;
