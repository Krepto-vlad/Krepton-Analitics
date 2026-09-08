import { configureStore } from '@reduxjs/toolkit';
import {
  createWatchlistItem,
  deleteWatchlistItem,
  fetchWatchlistItems,
} from '../../../api/watchlistApi';
import { fetchStockQuotesBatch } from '../../../api/stockApi';
import type { AppDispatch } from '../../../store';
import { authReducer, expireSession } from '../../auth/authSlice';
import {
  livePollingReducer,
  activateLivePollingScope,
  deactivateLivePollingScope,
  selectIsLivePollingScopeActive,
} from '../../livePolling/livePollingSlice';
import { setCurrency, setTheme, toggleTheme, uiReducer } from '../../ui/uiSlice';
import {
  addWatchlistItemThunk,
  deleteWatchlistItemThunk,
  fetchWatchlistThunk,
  refreshWatchlistQuotesThunk,
  syncWatchlistItems,
  watchlistReducer,
} from '../watchlistSlice';

jest.mock('../../../api/watchlistApi', () => ({
  fetchWatchlistItems: jest.fn(),
  createWatchlistItem: jest.fn(),
  deleteWatchlistItem: jest.fn(),
}));

jest.mock('../../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn(),
}));

const storedItem = {
  id: 'w1',
  ticker: 'AAPL',
  companyName: 'Apple',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function createStore() {
  return configureStore({
    reducer: {
      watchlist: watchlistReducer,
      auth: authReducer,
      ui: uiReducer,
      livePolling: livePollingReducer,
    },
  });
}

function dispatch(store: ReturnType<typeof createStore>) {
  return store.dispatch as AppDispatch;
}

describe('watchlistSlice and small slices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enriches stored watchlist items with quotes', async () => {
    jest.mocked(fetchWatchlistItems).mockResolvedValue([storedItem]);
    jest.mocked(fetchStockQuotesBatch).mockResolvedValue([
      {
        ticker: 'AAPL',
        name: 'Apple',
        price: 190,
        change: 1,
        changePercent: 0.5,
        volume: 1,
        marketCap: 1,
        currency: 'USD',
        fiftyTwoWeekHigh: 200,
        fiftyTwoWeekLow: 100,
        logoUrl: 'logo.png',
        marketState: 'REGULAR',
        exchange: 'NMS',
        preMarketPrice: null,
        preMarketChange: null,
        preMarketChangePercent: null,
        postMarketPrice: null,
        postMarketChange: null,
        postMarketChangePercent: null,
      },
    ]);

    const store = createStore();
    await dispatch(store)(fetchWatchlistThunk());
    expect(store.getState().watchlist.items[0]?.price).toBe(190);

    await dispatch(store)(refreshWatchlistQuotesThunk());
    expect(store.getState().watchlist.items[0]?.logoUrl).toBe('logo.png');
  });

  it('returns an empty list when there are no items to refresh', async () => {
    const store = createStore();
    await dispatch(store)(refreshWatchlistQuotesThunk());
    expect(store.getState().watchlist.items).toEqual([]);
  });

  it('adds and deletes items then refetches', async () => {
    jest.mocked(createWatchlistItem).mockResolvedValue(storedItem);
    jest.mocked(deleteWatchlistItem).mockResolvedValue(undefined);
    jest.mocked(fetchWatchlistItems).mockResolvedValue([]);
    jest.mocked(fetchStockQuotesBatch).mockResolvedValue([]);

    const store = createStore();
    await dispatch(store)(addWatchlistItemThunk({ ticker: 'AAPL', companyName: 'Apple' }));
    await dispatch(store)(deleteWatchlistItemThunk('w1'));
    expect(createWatchlistItem).toHaveBeenCalled();
    expect(deleteWatchlistItem).toHaveBeenCalledWith('w1');
  });

  it('stores fetch errors and resets on expireSession', async () => {
    jest.mocked(fetchWatchlistItems).mockRejectedValue(new Error('down'));
    const store = createStore();
    store.dispatch(syncWatchlistItems([]));
    await dispatch(store)(fetchWatchlistThunk());
    expect(store.getState().watchlist.error).toBe('down');
    store.dispatch(expireSession());
    expect(store.getState().watchlist.items).toEqual([]);
  });

  it('toggles UI theme/currency and live polling scopes', () => {
    const store = createStore();
    store.dispatch(setCurrency('EUR'));
    store.dispatch(setTheme('light'));
    store.dispatch(toggleTheme());
    store.dispatch(activateLivePollingScope('watchlist'));
    store.dispatch(activateLivePollingScope('watchlist'));
    store.dispatch(deactivateLivePollingScope('watchlist'));
    expect(store.getState().ui.currency).toBe('EUR');
    expect(store.getState().ui.theme).toBe('dark');
    expect(selectIsLivePollingScopeActive(store.getState(), 'watchlist')).toBe(true);
    store.dispatch(deactivateLivePollingScope('watchlist'));
    expect(selectIsLivePollingScopeActive(store.getState(), 'watchlist')).toBe(false);
  });
});
