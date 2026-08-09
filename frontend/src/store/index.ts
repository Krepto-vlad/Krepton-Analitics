import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { portfolioReducer } from '../features/portfolio/portfolioSlice';
import { watchlistReducer } from '../features/watchlist/watchlistSlice';
import { livePollingReducer } from '../features/livePolling/livePollingSlice';
import { tickerReducer } from '../features/ticker/tickerSlice';
import { uiReducer } from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    portfolio: portfolioReducer,
    watchlist: watchlistReducer,
    livePolling: livePollingReducer,
    ticker: tickerReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
