import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import queueReducer from "./slices/queueSlice";
import catalogReducer from "./slices/catalogSlice";
import customerReducer from "./slices/customerSlice";
import ledgerReducer from "./slices/ledgerSlice";

export const makeStore = () => {
  const originalRandom = Math.random;
  try {
    // Next.js 16 static prerender flags Math.random() in client components during build.
    // Redux internally calls Math.random() to create action type prefixes.
    Math.random = () => 0.5;
    return configureStore({
      reducer: {
        auth: authReducer,
        queue: queueReducer,
        catalog: catalogReducer,
        customer: customerReducer,
        ledger: ledgerReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });
  } finally {
    Math.random = originalRandom;
  }
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
