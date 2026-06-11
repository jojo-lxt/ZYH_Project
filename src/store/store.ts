import { configureStore } from "@reduxjs/toolkit";
import { consoleApi } from "@/store/consoleApi";
import consoleReducer from "@/store/consoleSlice";

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(consoleApi.middleware),
  reducer: {
    console: consoleReducer,
    [consoleApi.reducerPath]: consoleApi.reducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
