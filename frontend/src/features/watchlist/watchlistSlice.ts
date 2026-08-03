import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import type {
  WatchlistState,
  AddWatchlistPayload,
  StoredWatchlistItem,
  WatchlistItem,
} from '../../types/watchlist.types';
import type { StockQuote } from '../../types/stock.types';
import type { RootState } from '../../store';
import {
  fetchWatchlistItems,
  createWatchlistItem,
  deleteWatchlistItem,
} from '../../api/watchlistApi';
import { fetchStockQuotesBatch } from '../../api/stockApi';
import { ERROR_MESSAGES } from '../../constants';
import { getRejectedMessage } from '../../utils/apiError';
import { googleLoginThunk, loginThunk, logoutThunk, verifyEmailThunk } from '../auth/authSlice';

function mapQuoteToWatchlistItem(
  item: StoredWatchlistItem,
  quote: StockQuote | undefined
): WatchlistItem {
  return {
    id: item.id,
    ticker: item.ticker,
    companyName: item.companyName,
    price: quote?.price ?? 0,
    changePercent: quote?.changePercent ?? 0,
    currency: quote?.currency ?? 'USD',
    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
    logoUrl: quote?.logoUrl ?? null,
  };
}

function mergeWatchlistQuotes(items: WatchlistItem[], quotes: StockQuote[]): WatchlistItem[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.ticker, quote]));

  return items.map((item) => {
    const quote = quoteMap.get(item.ticker);
    if (!quote) return item;

    return {
      ...item,
      price: quote.price,
      changePercent: quote.changePercent,
      currency: quote.currency,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      logoUrl: quote.logoUrl ?? item.logoUrl ?? null,
    };
  });
}

async function enrichWatchlistItems(
  stored: StoredWatchlistItem[]
): Promise<WatchlistState['items']> {
  if (stored.length === 0) return [];

  const quotes = await fetchStockQuotesBatch(stored.map((item) => item.ticker));
  const quoteMap = new Map(quotes.map((quote) => [quote.ticker, quote]));

  return stored.map((item) => mapQuoteToWatchlistItem(item, quoteMap.get(item.ticker)));
}

export const fetchWatchlistThunk = createAsyncThunk<
  WatchlistState['items'],
  void,
  { rejectValue: string }
>('watchlist/fetch', async (_, { rejectWithValue }) => {
  try {
    const stored = await fetchWatchlistItems();
    return enrichWatchlistItems(stored);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.WATCHLIST_LOAD_FAILED));
  }
});

export const refreshWatchlistQuotesThunk = createAsyncThunk<
  WatchlistState['items'],
  void,
  { rejectValue: string; state: RootState }
>('watchlist/refreshQuotes', async (_, { getState, rejectWithValue }) => {
  try {
    const currentItems = getState().watchlist.items;
    if (currentItems.length === 0) return [];

    const quotes = await fetchStockQuotesBatch(currentItems.map((item) => item.ticker));
    return mergeWatchlistQuotes(currentItems, quotes);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.WATCHLIST_LOAD_FAILED));
  }
});

export const addWatchlistItemThunk = createAsyncThunk<
  void,
  AddWatchlistPayload,
  { rejectValue: string }
>('watchlist/add', async (payload, { dispatch, rejectWithValue }) => {
  try {
    await createWatchlistItem(payload);
    await dispatch(fetchWatchlistThunk());
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.WATCHLIST_ADD_FAILED));
  }
});

export const deleteWatchlistItemThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  'watchlist/delete',
  async (itemId, { dispatch, rejectWithValue }) => {
    try {
      await deleteWatchlistItem(itemId);
      await dispatch(fetchWatchlistThunk());
      return itemId;
    } catch (error) {
      return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.WATCHLIST_DELETE_FAILED));
    }
  }
);

const initialState: WatchlistState = {
  items: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    syncWatchlistItems: (state, action: { payload: WatchlistItem[] }) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchlistThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWatchlistThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchWatchlistThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(refreshWatchlistQuotesThunk.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(refreshWatchlistQuotesThunk.rejected, (state, action) => {
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(addWatchlistItemThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(addWatchlistItemThunk.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(addWatchlistItemThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(deleteWatchlistItemThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteWatchlistItemThunk.rejected, (state, action) => {
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addMatcher(
        isAnyOf(
          logoutThunk.fulfilled,
          loginThunk.fulfilled,
          googleLoginThunk.fulfilled,
          verifyEmailThunk.fulfilled
        ),
        () => initialState
      );
  },
});

export const { syncWatchlistItems } = watchlistSlice.actions;
export const watchlistReducer = watchlistSlice.reducer;
