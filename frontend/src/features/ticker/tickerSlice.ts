import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchStockFundamentals,
  fetchStockHistory,
  fetchStockNews,
  fetchStockQuote,
} from '../../api/stockApi';
import {
  DEFAULT_INTERVAL,
  DEFAULT_PERIOD,
  ERROR_MESSAGES,
  TICKER_FUNDAMENTALS_CLIENT_CACHE_TTL_MS,
  TICKER_HISTORY_CLIENT_CACHE_TTL_MS,
  TICKER_NEWS_CLIENT_CACHE_TTL_MS,
  TICKER_QUOTE_CLIENT_CACHE_TTL_MS,
} from '../../constants';
import type { RootState } from '../../store';
import type { NewsItem } from '../../types/portfolio.types';
import type { StockCompareItem, StockHistoryResponse, StockQuote } from '../../types/stock.types';
import { getRejectedMessage } from '../../utils/apiError';

export interface CachedTickerQuote {
  data: StockQuote;
  fetchedAt: number;
}

export interface CachedTickerHistory {
  data: StockHistoryResponse;
  fetchedAt: number;
}

export interface CachedTickerFundamentals {
  data: StockCompareItem;
  fetchedAt: number;
}

export interface CachedTickerNews {
  data: NewsItem[];
  fetchedAt: number;
}

export interface TickerState {
  quotesByTicker: Record<string, CachedTickerQuote>;
  historyByKey: Record<string, CachedTickerHistory>;
  fundamentalsByTicker: Record<string, CachedTickerFundamentals>;
  newsByTicker: Record<string, CachedTickerNews>;
  isLoadingQuote: boolean;
  isLoadingHistory: boolean;
  isLoadingFundamentals: boolean;
  isLoadingNews: boolean;
  error: string | null;
  newsError: string | null;
}

const initialState: TickerState = {
  quotesByTicker: {},
  historyByKey: {},
  fundamentalsByTicker: {},
  newsByTicker: {},
  isLoadingQuote: false,
  isLoadingHistory: false,
  isLoadingFundamentals: false,
  isLoadingNews: false,
  error: null,
  newsError: null,
};

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function buildTickerHistoryCacheKey(
  ticker: string,
  period: string,
  interval: string
): string {
  return `${normalizeTicker(ticker)}|${period}|${interval}`;
}

function isCacheFresh(fetchedAt: number, timeToLiveMs: number): boolean {
  return Date.now() - fetchedAt < timeToLiveMs;
}

export const fetchTickerQuoteThunk = createAsyncThunk<
  StockQuote,
  string,
  { rejectValue: string; state: RootState }
>('ticker/fetchQuote', async (ticker, { getState, rejectWithValue }) => {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = getState().ticker.quotesByTicker[normalizedTicker];

  if (cached && isCacheFresh(cached.fetchedAt, TICKER_QUOTE_CLIENT_CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    return await fetchStockQuote(normalizedTicker);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED));
  }
});

export const fetchTickerHistoryThunk = createAsyncThunk<
  { cacheKey: string; history: StockHistoryResponse },
  { ticker: string; period?: string; interval?: string },
  { rejectValue: string; state: RootState }
>('ticker/fetchHistory', async (params, { getState, rejectWithValue }) => {
  const normalizedTicker = normalizeTicker(params.ticker);
  const period = params.period ?? DEFAULT_PERIOD;
  const interval = params.interval ?? DEFAULT_INTERVAL;
  const cacheKey = buildTickerHistoryCacheKey(normalizedTicker, period, interval);
  const cached = getState().ticker.historyByKey[cacheKey];

  if (cached && isCacheFresh(cached.fetchedAt, TICKER_HISTORY_CLIENT_CACHE_TTL_MS)) {
    return { cacheKey, history: cached.data };
  }

  try {
    const history = await fetchStockHistory(normalizedTicker, period, interval);
    return { cacheKey, history };
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED));
  }
});

export const fetchTickerFundamentalsThunk = createAsyncThunk<
  StockCompareItem,
  string,
  { rejectValue: string; state: RootState }
>('ticker/fetchFundamentals', async (ticker, { getState, rejectWithValue }) => {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = getState().ticker.fundamentalsByTicker[normalizedTicker];

  if (cached && isCacheFresh(cached.fetchedAt, TICKER_FUNDAMENTALS_CLIENT_CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    return await fetchStockFundamentals(normalizedTicker);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED));
  }
});

export const fetchTickerNewsThunk = createAsyncThunk<
  { ticker: string; news: NewsItem[] },
  string,
  { rejectValue: string; state: RootState }
>('ticker/fetchNews', async (ticker, { getState, rejectWithValue }) => {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = getState().ticker.newsByTicker[normalizedTicker];

  if (cached && isCacheFresh(cached.fetchedAt, TICKER_NEWS_CLIENT_CACHE_TTL_MS)) {
    return { ticker: normalizedTicker, news: cached.data };
  }

  try {
    const news = await fetchStockNews(normalizedTicker);
    return { ticker: normalizedTicker, news };
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.STOCK_TICKER_NEWS_FAILED));
  }
});

const tickerSlice = createSlice({
  name: 'ticker',
  initialState,
  reducers: {
    clearTickerError: (state) => {
      state.error = null;
      state.newsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickerQuoteThunk.pending, (state) => {
        state.isLoadingQuote = true;
        state.error = null;
      })
      .addCase(fetchTickerQuoteThunk.fulfilled, (state, action) => {
        state.isLoadingQuote = false;
        state.quotesByTicker[action.payload.ticker.toUpperCase()] = {
          data: action.payload,
          fetchedAt: Date.now(),
        };
      })
      .addCase(fetchTickerQuoteThunk.rejected, (state, action) => {
        state.isLoadingQuote = false;
        state.error = action.payload ?? ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED;
      })
      .addCase(fetchTickerHistoryThunk.pending, (state) => {
        state.isLoadingHistory = true;
        state.error = null;
      })
      .addCase(fetchTickerHistoryThunk.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.historyByKey[action.payload.cacheKey] = {
          data: action.payload.history,
          fetchedAt: Date.now(),
        };
      })
      .addCase(fetchTickerHistoryThunk.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.error = action.payload ?? ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED;
      })
      .addCase(fetchTickerFundamentalsThunk.pending, (state) => {
        state.isLoadingFundamentals = true;
        state.error = null;
      })
      .addCase(fetchTickerFundamentalsThunk.fulfilled, (state, action) => {
        state.isLoadingFundamentals = false;
        state.fundamentalsByTicker[action.payload.ticker.toUpperCase()] = {
          data: action.payload,
          fetchedAt: Date.now(),
        };
      })
      .addCase(fetchTickerFundamentalsThunk.rejected, (state, action) => {
        state.isLoadingFundamentals = false;
        state.error = action.payload ?? ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED;
      })
      .addCase(fetchTickerNewsThunk.pending, (state) => {
        state.isLoadingNews = true;
        state.newsError = null;
      })
      .addCase(fetchTickerNewsThunk.fulfilled, (state, action) => {
        state.isLoadingNews = false;
        state.newsByTicker[action.payload.ticker] = {
          data: action.payload.news,
          fetchedAt: Date.now(),
        };
      })
      .addCase(fetchTickerNewsThunk.rejected, (state, action) => {
        state.isLoadingNews = false;
        state.newsError = action.payload ?? ERROR_MESSAGES.STOCK_TICKER_NEWS_FAILED;
      });
  },
});

export const { clearTickerError } = tickerSlice.actions;
export const tickerReducer = tickerSlice.reducer;
