import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    // feature slices added here as they are implemented:
    // stock: stockReducer,
    // auth: authReducer,
    // rebalancing: rebalancingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
