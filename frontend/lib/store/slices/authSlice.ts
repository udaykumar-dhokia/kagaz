import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { loginShop, registerShop } from "@/lib/api";

export interface ShopData {
  id: string;
  name: string;
  slug: string;
  ownerEmail?: string;
  ownerPhone?: string | null;
  address?: string | null;
  upiId?: string | null;
  logoUrl?: string | null;
  avatarUrl?: string;
  subscription?: {
    status: "TRIAL" | "ACTIVE" | "EXPIRED";
    isTrialActive: boolean;
    trialDaysRemaining: number;
    trialEndsAt: string;
    isSubscriptionActive: boolean;
    subscriptionEndsAt: string | null;
    canAccessPlatform: boolean;
  };
}

export interface AuthState {
  token: string | null;
  shop: ShopData | null;
  isAuthenticated: boolean | null; // null during initial hydration
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  shop: null,
  isAuthenticated: null,
  isLoading: false,
  error: null,
};

export const loginShopkeeper = createAsyncThunk(
  "auth/login",
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await loginShop(payload);
      return {
        token: res.data.token as string,
        shop: res.data.shop as ShopData,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to sign in");
    }
  }
);

export const registerShopkeeper = createAsyncThunk(
  "auth/register",
  async (
    payload: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      isColorEnabled?: boolean;
      bwSinglePrice?: number;
      bwDoublePrice?: number;
      colorSinglePrice?: number;
      colorDoublePrice?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await registerShop(payload);
      return {
        token: res.data.token as string,
        shop: res.data.shop as ShopData,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Registration failed");
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    restoreSession: (state) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("kagaz_shop_token");
        const rawShop = localStorage.getItem("kagaz_shop_data");
        if (token) {
          state.token = token;
          state.isAuthenticated = true;
          if (rawShop) {
            try {
              state.shop = JSON.parse(rawShop);
            } catch {}
          }
        } else {
          state.token = null;
          state.shop = null;
          state.isAuthenticated = false;
        }
      } else {
        state.isAuthenticated = false;
      }
    },
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; shop: ShopData }>
    ) => {
      state.token = action.payload.token;
      state.shop = action.payload.shop;
      state.isAuthenticated = true;
      state.error = null;
      if (typeof window !== "undefined") {
        localStorage.setItem("kagaz_shop_token", action.payload.token);
        localStorage.setItem(
          "kagaz_shop_data",
          JSON.stringify(action.payload.shop)
        );
      }
    },
    logout: (state) => {
      state.token = null;
      state.shop = null;
      state.isAuthenticated = false;
      state.error = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("kagaz_shop_token");
        localStorage.removeItem("kagaz_shop_data");
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    updateShopData: (state, action: PayloadAction<Partial<ShopData>>) => {
      if (state.shop) {
        state.shop = { ...state.shop, ...action.payload };
        if (typeof window !== "undefined") {
          localStorage.setItem("kagaz_shop_data", JSON.stringify(state.shop));
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginShopkeeper.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginShopkeeper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.shop = action.payload.shop;
        state.isAuthenticated = true;
        state.error = null;
        if (typeof window !== "undefined") {
          localStorage.setItem("kagaz_shop_token", action.payload.token);
          localStorage.setItem(
            "kagaz_shop_data",
            JSON.stringify(action.payload.shop)
          );
        }
      })
      .addCase(loginShopkeeper.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerShopkeeper.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerShopkeeper.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.shop = action.payload.shop;
        state.isAuthenticated = true;
        state.error = null;
        if (typeof window !== "undefined") {
          localStorage.setItem("kagaz_shop_token", action.payload.token);
          localStorage.setItem(
            "kagaz_shop_data",
            JSON.stringify(action.payload.shop)
          );
        }
      })
      .addCase(registerShopkeeper.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { restoreSession, setCredentials, logout, clearAuthError, updateShopData } =
  authSlice.actions;
export default authSlice.reducer;

