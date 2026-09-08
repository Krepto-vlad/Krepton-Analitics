import { configureStore } from '@reduxjs/toolkit';
import { fetchStockHistory, fetchStockQuote, fetchStockSearch } from '../../api/stockApi';
import type { AppDispatch } from '../../store';
import type { StockQuote } from '../../types/stock.types';
import stockReducer, {
  clearSearchResults,
  loadStockHistory,
  loadStockQuote,
  searchStocks,
  setSelectedPeriod,
  setSelectedTicker,
  updateQuoteFromWs,
} from '../stockSlice';

jest.mock('../../api/stockApi', () => ({
  fetchStockQuote: jest.fn(),
  fetchStockHistory: jest.fn(),
  fetchStockSearch: jest.fn(),
}));

const quote: StockQuote = {
  ticker: 'AAPL',
  name: 'Apple',
  price: 100,
  change: 1,
  changePercent: 1,
  volume: 1,
  marketCap: 1,
  currency: 'USD',
  fiftyTwoWeekHigh: 120,
  fiftyTwoWeekLow: 80,
  logoUrl: null,
  marketState: 'REGULAR',
  exchange: 'NMS',
  preMarketPrice: null,
  preMarketChange: null,
  preMarketChangePercent: null,
  postMarketPrice: null,
  postMarketChange: null,
  postMarketChangePercent: null,
};

function createStore() {
  return configureStore({ reducer: { stock: stockReducer } });
}

function dispatch(store: ReturnType<typeof createStore>) {
  return store.dispatch as AppDispatch;
}

describe('stockSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates ticker, period, and live websocket quotes', () => {
    const store = createStore();
    store.dispatch(setSelectedTicker('MSFT'));
    store.dispatch(setSelectedPeriod('1mo'));
    expect(store.getState().stock.selectedTicker).toBe('MSFT');
    expect(store.getState().stock.selectedPeriod).toBe('1mo');

    store.dispatch(loadStockQuote.fulfilled(quote, 'req', 'AAPL'));
    store.dispatch(
      updateQuoteFromWs({
        type: 'QUOTE_UPDATE',
        ticker: 'AAPL',
        price: 110,
        change: 10,
        changePercent: 10,
        currency: 'USD',
        timestamp: 1,
      })
    );
    expect(store.getState().stock.quote?.price).toBe(110);
    expect(store.getState().stock.isLive).toBe(true);

    store.dispatch(
      updateQuoteFromWs({
        type: 'QUOTE_UPDATE',
        ticker: 'MSFT',
        price: 1,
        change: 0,
        changePercent: 0,
        currency: 'USD',
        timestamp: 1,
      })
    );
    expect(store.getState().stock.quote?.price).toBe(110);
  });

  it('loads quote, history, and search results', async () => {
    jest.mocked(fetchStockQuote).mockResolvedValue(quote);
    jest
      .mocked(fetchStockHistory)
      .mockResolvedValue({ ticker: 'AAPL', interval: '1d', candles: [] });
    jest
      .mocked(fetchStockSearch)
      .mockResolvedValue([{ ticker: 'AAPL', name: 'Apple', exchange: 'NMS', type: 'EQUITY' }]);

    const store = createStore();
    await dispatch(store)(loadStockQuote('AAPL'));
    await dispatch(store)(loadStockHistory({ ticker: 'AAPL', period: '1y', interval: '1d' }));
    await dispatch(store)(searchStocks('apple'));
    store.dispatch(clearSearchResults());

    expect(store.getState().stock.quote?.ticker).toBe('AAPL');
    expect(store.getState().stock.history?.ticker).toBe('AAPL');
    expect(store.getState().stock.searchResults).toEqual([]);
  });

  it('records quote and history errors', async () => {
    jest.mocked(fetchStockQuote).mockRejectedValue(new Error('quote down'));
    jest.mocked(fetchStockHistory).mockRejectedValue(new Error('history down'));
    jest.mocked(fetchStockSearch).mockRejectedValue(new Error('search down'));

    const store = createStore();
    await dispatch(store)(loadStockQuote('AAPL'));
    await dispatch(store)(loadStockHistory({ ticker: 'AAPL', period: '1y', interval: '1d' }));
    await dispatch(store)(searchStocks('apple'));

    expect(store.getState().stock.quoteError).toBe('quote down');
    expect(store.getState().stock.historyError).toBe('history down');
    expect(store.getState().stock.isSearchLoading).toBe(false);
  });
});
