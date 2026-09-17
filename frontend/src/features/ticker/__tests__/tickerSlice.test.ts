import { configureStore } from '@reduxjs/toolkit';
import {
  fetchStockFundamentals,
  fetchStockHistory,
  fetchStockNews,
  fetchStockQuote,
} from '../../../api/stockApi';
import { tickerReducer } from '../tickerSlice';
import {
  clearTickerError,
  fetchTickerFundamentalsThunk,
  fetchTickerHistoryThunk,
  fetchTickerNewsThunk,
  fetchTickerQuoteThunk,
} from '../tickerSlice';
import {
  selectTickerFundamentals,
  selectTickerHistory,
  selectTickerNews,
  selectTickerQuote,
} from '../tickerSelectors';
import { uiReducer } from '../../ui/uiSlice';
import type { AppDispatch } from '../../../store';
import { ApiRequestError } from '../../../utils/apiError';
import { ERROR_MESSAGES, TICKER_QUOTE_CLIENT_CACHE_TTL_MS } from '../../../constants';
import type { StockQuote } from '../../../types/stock.types';

jest.mock('../../../api/stockApi', () => ({
  fetchStockQuote: jest.fn(),
  fetchStockHistory: jest.fn(),
  fetchStockFundamentals: jest.fn(),
  fetchStockNews: jest.fn(),
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
  return configureStore({
    reducer: { ticker: tickerReducer, ui: uiReducer },
  });
}

function dispatch(store: ReturnType<typeof createStore>) {
  return store.dispatch as AppDispatch;
}

describe('tickerSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('caches quote, history, fundamentals, and news', async () => {
    jest.mocked(fetchStockQuote).mockResolvedValue(quote);
    jest
      .mocked(fetchStockHistory)
      .mockResolvedValue({ ticker: 'AAPL', interval: '1d', candles: [] });
    jest.mocked(fetchStockFundamentals).mockResolvedValue({
      ticker: 'AAPL',
      name: 'Apple',
      currency: 'USD',
      price: 100,
      sector: 'Technology',
      industry: null,
      marketCap: 1,
      enterpriseValue: null,
      trailingEps: null,
      peRatio: null,
      forwardPeRatio: null,
      pegRatio: null,
      psRatio: null,
      priceToBook: null,
      evToEbitda: null,
      roe: null,
      roa: null,
      profitMargin: null,
      operatingMargin: null,
      revenueGrowth: null,
      earningsGrowth: null,
      debtToEquity: null,
      currentRatio: null,
      dividendYield: null,
      payoutRatio: null,
      beta: null,
    });
    jest.mocked(fetchStockNews).mockResolvedValue([]);

    const store = createStore();
    await dispatch(store)(fetchTickerQuoteThunk('aapl'));
    await dispatch(store)(fetchTickerHistoryThunk({ ticker: 'aapl' }));
    await dispatch(store)(fetchTickerFundamentalsThunk('aapl'));
    await dispatch(store)(fetchTickerNewsThunk('aapl'));

    const state = store.getState();
    expect(selectTickerQuote(state as never, 'AAPL')?.price).toBe(100);
    expect(selectTickerHistory(state as never, 'AAPL')?.ticker).toBe('AAPL');
    expect(selectTickerFundamentals(state as never, 'AAPL')?.name).toBe('Apple');
    expect(selectTickerNews(state as never, 'AAPL')).toEqual([]);

    await dispatch(store)(fetchTickerQuoteThunk('aapl'));
    expect(fetchStockQuote).toHaveBeenCalledTimes(1);
  });

  it('keeps showing a cached quote while a stale refresh is in flight', async () => {
    jest.mocked(fetchStockQuote).mockResolvedValue(quote);
    const store = createStore();
    await dispatch(store)(fetchTickerQuoteThunk('aapl'));

    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + TICKER_QUOTE_CLIENT_CACHE_TTL_MS + 1);
    let releaseRefresh: (value: StockQuote) => void = () => undefined;
    jest.mocked(fetchStockQuote).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseRefresh = resolve;
        })
    );

    const pending = dispatch(store)(fetchTickerQuoteThunk('aapl'));
    expect(store.getState().ticker.isLoadingQuote).toBe(false);
    expect(selectTickerQuote(store.getState() as never, 'AAPL')?.price).toBe(100);

    releaseRefresh({ ...quote, price: 101 });
    await pending;
    jest.useRealTimers();
  });

  it('maps a 404 quote error to a not-found message', async () => {
    jest.mocked(fetchStockQuote).mockRejectedValue(new ApiRequestError('gone', 404, 'client'));
    const store = createStore();
    await dispatch(store)(fetchTickerQuoteThunk('ZZZZ'));
    expect(store.getState().ticker.error).toMatch(/ZZZZ/);
    store.dispatch(clearTickerError());
    expect(store.getState().ticker.error).toBeNull();
  });

  it('stores a generic news error', async () => {
    jest.mocked(fetchStockNews).mockRejectedValue(new Error('down'));
    const store = createStore();
    await dispatch(store)(fetchTickerNewsThunk('AAPL'));
    expect(store.getState().ticker.newsError).toBe('down');
  });

  it('clears loading flags on history/fundamentals failure', async () => {
    jest.mocked(fetchStockHistory).mockRejectedValue(new Error(ERROR_MESSAGES.UNKNOWN));
    jest.mocked(fetchStockFundamentals).mockRejectedValue(new Error('nope'));
    const store = createStore();
    await dispatch(store)(fetchTickerHistoryThunk({ ticker: 'AAPL' }));
    await dispatch(store)(fetchTickerFundamentalsThunk('AAPL'));
    expect(store.getState().ticker.isLoadingHistory).toBe(false);
    expect(store.getState().ticker.isLoadingFundamentals).toBe(false);
  });
});
