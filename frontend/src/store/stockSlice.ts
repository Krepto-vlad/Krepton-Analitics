import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchStockQuote, fetchStockHistory, fetchStockSearch } from '../api/stockApi';
import type { StockQuote, StockHistoryResponse, StockSearchResult } from '../types/stock.types';
import type { WsQuoteUpdateMessage } from '../types/ws.types';
import { DEFAULT_TICKER, DEFAULT_PERIOD, DEFAULT_INTERVAL } from '../constants';

interface StockState {
  selectedTicker: string;
  selectedPeriod: string;
  quote: StockQuote | null;
  isLive: boolean;
  history: StockHistoryResponse | null;
  searchResults: StockSearchResult[];
  isQuoteLoading: boolean;
  isHistoryLoading: boolean;
  isSearchLoading: boolean;
  quoteError: string | null;
  historyError: string | null;
}

const initialState: StockState = {
  selectedTicker: DEFAULT_TICKER,
  selectedPeriod: DEFAULT_PERIOD,
  quote: null,
  isLive: false,
  history: null,
  searchResults: [],
  isQuoteLoading: false,
  isHistoryLoading: false,
  isSearchLoading: false,
  quoteError: null,
  historyError: null,
};

export const loadStockQuote = createAsyncThunk('stock/loadQuote', async (ticker: string) =>
  fetchStockQuote(ticker)
);

export const loadStockHistory = createAsyncThunk(
  'stock/loadHistory',
  async ({ ticker, period, interval }: { ticker: string; period: string; interval: string }) =>
    fetchStockHistory(ticker, period, interval)
);

export const searchStocks = createAsyncThunk('stock/search', async (query: string) =>
  fetchStockSearch(query)
);

const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    setSelectedTicker(state, action: PayloadAction<string>) {
      state.selectedTicker = action.payload;
    },
    setSelectedPeriod(state, action: PayloadAction<string>) {
      state.selectedPeriod = action.payload;
    },
    clearSearchResults(state) {
      state.searchResults = [];
    },
    updateQuoteFromWs(state, action: PayloadAction<WsQuoteUpdateMessage>) {
      if (!state.quote || state.quote.ticker !== action.payload.ticker) return;
      state.quote.price = action.payload.price;
      state.quote.change = action.payload.change;
      state.quote.changePercent = action.payload.changePercent;
      state.isLive = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStockQuote.pending, (state) => {
        state.isQuoteLoading = true;
        state.quoteError = null;
      })
      .addCase(loadStockQuote.fulfilled, (state, action) => {
        state.isQuoteLoading = false;
        state.quote = action.payload;
      })
      .addCase(loadStockQuote.rejected, (state, action) => {
        state.isQuoteLoading = false;
        state.quoteError = action.error.message ?? 'Failed to load quote';
      })
      .addCase(loadStockHistory.pending, (state) => {
        state.isHistoryLoading = true;
        state.historyError = null;
      })
      .addCase(loadStockHistory.fulfilled, (state, action) => {
        state.isHistoryLoading = false;
        state.history = action.payload;
      })
      .addCase(loadStockHistory.rejected, (state, action) => {
        state.isHistoryLoading = false;
        state.historyError = action.error.message ?? 'Failed to load history';
      })
      .addCase(searchStocks.pending, (state) => {
        state.isSearchLoading = true;
      })
      .addCase(searchStocks.fulfilled, (state, action) => {
        state.isSearchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchStocks.rejected, (state) => {
        state.isSearchLoading = false;
      });
  },
});

export const { setSelectedTicker, setSelectedPeriod, clearSearchResults, updateQuoteFromWs } =
  stockSlice.actions;
export default stockSlice.reducer;

export { DEFAULT_INTERVAL };
