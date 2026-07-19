import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  PortfolioState,
  PortfolioPosition,
  EquityDataPoint,
} from '../../types/portfolio.types';
import {
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioTransactionsPage,
  fetchPortfolioEquityHistory as apiFetchEquityHistory,
  fetchInvestmentSummary as apiFetchInvestmentSummary,
  createPortfolioPosition,
  deletePortfolioPosition as apiDeletePosition,
  deleteBuyTransaction as apiDeleteBuyTransaction,
  closePortfolioPosition as apiClosePosition,
} from '../../api/portfolioApi';
import type {
  AddPositionPayload,
  ClosePositionPayload,
  StoredPosition,
  InvestmentSummary,
  PortfolioTransaction,
} from '../../api/portfolioApi';
import { fetchStockQuotesBatch } from '../../api/stockApi';
import { ERROR_MESSAGES } from '../../constants';
import { getRejectedMessage } from '../../utils/apiError';
import { fetchLiveFxRates } from '../../api/fxApi';
import type { StockQuote } from '../../types/stock.types';
import type { RootState } from '../../store';
import type { Currency } from '../../constants';
import { HOLDINGS_PAGE_SIZE, TRANSACTIONS_PAGE_SIZE } from '../../constants';
import {
  convertAmountWithRate,
  getTodayIsoDate,
  resolveEquityHistoryForDisplay,
} from '../../utils/moneyDisplay';

// ─── Equity history (simulated — dashboard placeholder) ───────────────────────

function lcgRandom(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 4294967295;
}

function generateEquityHistory(): EquityDataPoint[] {
  const result: EquityDataPoint[] = [];
  const startDate = new Date('2024-01-02');
  const endDate = new Date('2026-06-30');
  const totalMs = endDate.getTime() - startDate.getTime();

  let value = 820000;
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const progress = (cursor.getTime() - startDate.getTime()) / totalMs;
      const target = 820000 + 170000 * Math.pow(progress, 0.7);
      const rand = lcgRandom(result.length);
      const drift = (target - value) * 0.035;
      const noise = (rand - 0.5) * 16000;
      value = Math.max(value + drift + noise, 750000);
      result.push({ time: cursor.toISOString().slice(0, 10), value: Math.round(value) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function enrichStoredPositions(
  stored: StoredPosition[],
  displayCurrency: Currency
): Promise<PortfolioPosition[]> {
  if (stored.length === 0) return [];

  const uniqueTickers = [...new Set(stored.map((position) => position.ticker))];
  const quoteResults = await fetchStockQuotesBatch(uniqueTickers);

  const quoteMap = new Map<string, StockQuote>();
  quoteResults.forEach((quote) => {
    quoteMap.set(quote.ticker, quote);
  });

  const quoteCurrencies = quoteResults.map((quote) => quote.currency as Currency);
  const liveFxRates = await fetchLiveFxRates(quoteCurrencies, displayCurrency, getTodayIsoDate());

  return stored.map((storedPosition): PortfolioPosition => {
    const quote = quoteMap.get(storedPosition.ticker);
    const quoteCurrency = (quote?.currency ?? storedPosition.currency) as Currency;
    const nativeCurrentPrice = quote?.price ?? storedPosition.avgBuyPrice;
    const displayAvgBuyPrice = storedPosition.displayAvgBuyPrice ?? storedPosition.avgBuyPrice;
    const fxRate = quoteCurrency === displayCurrency ? 1 : (liveFxRates[quoteCurrency] ?? 1);
    const displayCurrentPrice = convertAmountWithRate(nativeCurrentPrice, fxRate);

    return {
      id: storedPosition.id,
      ticker: storedPosition.ticker,
      companyName: storedPosition.companyName,
      shares: storedPosition.shares,
      avgBuyPrice: displayAvgBuyPrice,
      currency: displayCurrency,
      sector: storedPosition.sector,
      entryDate: storedPosition.entryDate,
      currentPrice: displayCurrentPrice,
    };
  });
}

function mapTransactionForDisplay(
  transaction: PortfolioTransaction,
  displayCurrency: Currency
): PortfolioState['transactions'][number] {
  const displayPricePerShare = transaction.displayPricePerShare ?? transaction.pricePerShare;
  const displayTotalAmount =
    transaction.displayTotalAmount ?? transaction.shares * transaction.pricePerShare;

  return {
    ...transaction,
    pricePerShare: displayPricePerShare,
    currency: displayCurrency,
    displayCurrency,
    displayPricePerShare,
    displayTotalAmount,
    displayFxRate: transaction.displayFxRate,
    displayFxRateDate: transaction.displayFxRateDate,
  };
}

function mergeQuotePricesIntoPositions(
  positions: PortfolioPosition[],
  quotes: StockQuote[],
  displayCurrency: Currency,
  liveFxRates: Record<Currency, number>
): PortfolioPosition[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.ticker, quote]));

  return positions.map((position) => {
    const quote = quoteMap.get(position.ticker);
    if (!quote) {
      return position;
    }

    const quoteCurrency = quote.currency as Currency;
    const fxRate = quoteCurrency === displayCurrency ? 1 : (liveFxRates[quoteCurrency] ?? 1);

    return {
      ...position,
      currentPrice: convertAmountWithRate(quote.price, fxRate),
      currency: displayCurrency,
    };
  });
}

export interface HoldingsQuotesSyncPayload {
  summaryPositions: PortfolioPosition[];
  positions: PortfolioPosition[];
}

async function refreshPortfolioData(dispatch: (action: unknown) => unknown): Promise<void> {
  await Promise.all([
    dispatch(fetchPortfolioSummaryThunk()),
    dispatch(fetchInvestmentSummaryThunk()),
    dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
    dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
    dispatch(fetchPortfolioEquityHistoryThunk()),
  ]);
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** All positions — used for stats, sectors, and dashboard. */
export const fetchPortfolioPositionsThunk = createAsyncThunk<
  PortfolioPosition[],
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchPositions', async (_, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    const stored = await fetchPortfolioPositions(displayCurrency);
    return enrichStoredPositions(stored, displayCurrency);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

/** All positions for portfolio page summary cards and charts. */
export const fetchPortfolioSummaryThunk = createAsyncThunk<
  PortfolioPosition[],
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchSummary', async (_, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    const stored = await fetchPortfolioPositions(displayCurrency);
    return enrichStoredPositions(stored, displayCurrency);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const fetchInvestmentSummaryThunk = createAsyncThunk<
  InvestmentSummary,
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchInvestmentSummary', async (_, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    return await apiFetchInvestmentSummary(displayCurrency);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const fetchPositionsPageThunk = createAsyncThunk<
  { items: PortfolioPosition[]; total: number; hasMore: boolean; append: boolean },
  { offset: number; append: boolean },
  { rejectValue: string; state: RootState }
>('portfolio/fetchPositionsPage', async ({ offset, append }, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    const page = await fetchPortfolioPositionsPage(HOLDINGS_PAGE_SIZE, offset, displayCurrency);
    const items = await enrichStoredPositions(page.items, displayCurrency);
    return { items, total: page.total, hasMore: page.hasMore, append };
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const fetchTransactionsPageThunk = createAsyncThunk<
  {
    items: PortfolioState['transactions'];
    total: number;
    hasMore: boolean;
    append: boolean;
  },
  { offset: number; append: boolean },
  { rejectValue: string; state: RootState }
>('portfolio/fetchTransactionsPage', async ({ offset, append }, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    const page = await fetchPortfolioTransactionsPage(
      TRANSACTIONS_PAGE_SIZE,
      offset,
      displayCurrency
    );
    return {
      items: page.items.map((transaction) =>
        mapTransactionForDisplay(transaction, displayCurrency)
      ),
      total: page.total,
      hasMore: page.hasMore,
      append,
    };
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const fetchPortfolioEquityHistoryThunk = createAsyncThunk<
  EquityDataPoint[],
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchEquityHistory', async (_, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    const points = await apiFetchEquityHistory(displayCurrency);
    return resolveEquityHistoryForDisplay(points, displayCurrency);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const refreshHoldingsQuotesThunk = createAsyncThunk<
  HoldingsQuotesSyncPayload,
  void,
  { rejectValue: string; state: RootState }
>('portfolio/refreshQuotes', async (_, { getState, rejectWithValue }) => {
  try {
    const displayCurrency = getState().ui.currency;
    const { summaryPositions, positions } = getState().portfolio;

    if (summaryPositions.length === 0 && positions.length === 0) {
      return { summaryPositions: [], positions: [] };
    }

    const uniqueTickers = [
      ...new Set([
        ...summaryPositions.map((position) => position.ticker),
        ...positions.map((position) => position.ticker),
      ]),
    ];

    const quotes = await fetchStockQuotesBatch(uniqueTickers);
    const liveFxRates = await fetchLiveFxRates(
      quotes.map((quote) => quote.currency as Currency),
      displayCurrency,
      getTodayIsoDate()
    );

    return {
      summaryPositions: mergeQuotePricesIntoPositions(
        summaryPositions,
        quotes,
        displayCurrency,
        liveFxRates
      ),
      positions: mergeQuotePricesIntoPositions(positions, quotes, displayCurrency, liveFxRates),
    };
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED));
  }
});

export const deletePositionThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  'portfolio/deletePosition',
  async (positionId, { dispatch, rejectWithValue }) => {
    try {
      await apiDeletePosition(positionId);
      await refreshPortfolioData(dispatch);
      return positionId;
    } catch (error) {
      return rejectWithValue(
        getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_POSITION_DELETE_FAILED)
      );
    }
  }
);

export const deleteBuyTransactionThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  'portfolio/deleteBuyTransaction',
  async (transactionId, { dispatch, rejectWithValue }) => {
    try {
      await apiDeleteBuyTransaction(transactionId);
      await refreshPortfolioData(dispatch);
      return transactionId;
    } catch (error) {
      return rejectWithValue(
        getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_TRANSACTION_DELETE_FAILED)
      );
    }
  }
);

export const closePositionThunk = createAsyncThunk<
  void,
  { positionId: string; payload: ClosePositionPayload },
  { rejectValue: string }
>('portfolio/closePosition', async ({ positionId, payload }, { dispatch, rejectWithValue }) => {
  try {
    await apiClosePosition(positionId, payload);
    await refreshPortfolioData(dispatch);
  } catch (error) {
    return rejectWithValue(
      getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_POSITION_CLOSE_FAILED)
    );
  }
});

export const addPositionThunk = createAsyncThunk<void, AddPositionPayload, { rejectValue: string }>(
  'portfolio/addPosition',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      await createPortfolioPosition(payload);
      await refreshPortfolioData(dispatch);
    } catch (error) {
      return rejectWithValue(
        getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_POSITION_ADD_FAILED)
      );
    }
  }
);

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: PortfolioState = {
  positions: [],
  positionsTotal: 0,
  positionsHasMore: false,
  isLoadingMorePositions: false,
  summaryPositions: [],
  investmentSummary: { totalInvested: 0, totalWithdrawn: 0 },
  transactions: [],
  transactionsTotal: 0,
  transactionsHasMore: false,
  isLoadingTransactions: false,
  isLoadingMoreTransactions: false,
  stats: {
    totalValue: 990100,
    totalPnl: 127430,
    unrealizedPnl: 89218,
    realizedPnl: 38212,
    dayPnl: -2440,
    totalPnlPercent: 19.1,
    dayPnlPercent: -0.25,
  },
  sectorAllocations: [
    { sector: 'Information Technology', percentage: 70, color: '#ef4444' },
    { sector: 'Financials', percentage: 14, color: '#f59e0b' },
    { sector: 'Healthcare', percentage: 8, color: '#10b981' },
    { sector: 'Industrials', percentage: 4, color: '#3b82f6' },
    { sector: 'Energy', percentage: 4, color: '#8b5cf6' },
  ],
  news: [
    {
      id: '1',
      tickers: ['AAPL'],
      source: 'Bloomberg',
      timeAgo: '24 min ago',
      headline:
        'Apple exceeds Q2 earnings expectations with record services revenue of $73.8B, beating analyst forecasts by 4.7%',
    },
    {
      id: '2',
      tickers: ['SBER'],
      source: 'BBC',
      timeAgo: '38 min ago',
      headline:
        'Sberbank reports decline in net profit amid geopolitical headwinds; shares react to revised guidance',
    },
    {
      id: '3',
      tickers: ['MSFT'],
      source: 'Reuters',
      timeAgo: '1 hr ago',
      headline:
        'Microsoft Azure cloud growth accelerates to 33% YoY — CIO Satya Nadella cites AI adoption as primary driver',
    },
    {
      id: '4',
      tickers: ['NVDA'],
      source: 'The Verge',
      timeAgo: '2 hr ago',
      headline:
        'NVIDIA announces next-gen Blackwell Ultra GPU architecture; H100 supply chain constraints ease heading into H2',
    },
    {
      id: '5',
      tickers: ['GOOGL'],
      source: 'FT',
      timeAgo: '3 hr ago',
      headline:
        'Alphabet antitrust ruling could reshape global advertising market — GOOGL sees modest pre-market reaction',
    },
    {
      id: '6',
      tickers: ['GAZP'],
      source: 'Reuters',
      timeAgo: '4 hr ago',
      headline:
        'Gazprom LNG export volumes fall for third consecutive quarter; European demand substitute accelerates',
    },
  ],
  equityHistory: generateEquityHistory(),
  isLoading: false,
  error: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    syncHoldingsQuotes: (state, action: { payload: HoldingsQuotesSyncPayload }) => {
      state.summaryPositions = action.payload.summaryPositions;
      state.positions = action.payload.positions;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolioPositionsThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPortfolioPositionsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.positions = action.payload;
      })
      .addCase(fetchPortfolioPositionsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(fetchPortfolioSummaryThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPortfolioSummaryThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summaryPositions = action.payload;
      })
      .addCase(fetchPortfolioSummaryThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(fetchInvestmentSummaryThunk.fulfilled, (state, action) => {
        state.investmentSummary = action.payload;
      })
      .addCase(fetchPositionsPageThunk.pending, (state, action) => {
        if (action.meta.arg.append) {
          state.isLoadingMorePositions = true;
        } else if (state.summaryPositions.length === 0) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchPositionsPageThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isLoadingMorePositions = false;
        state.positions = action.payload.append
          ? [...state.positions, ...action.payload.items]
          : action.payload.items;
        state.positionsTotal = action.payload.total;
        state.positionsHasMore = action.payload.hasMore;
      })
      .addCase(fetchPositionsPageThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isLoadingMorePositions = false;
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(fetchTransactionsPageThunk.pending, (state, action) => {
        if (action.meta.arg.append) {
          state.isLoadingMoreTransactions = true;
        } else {
          state.isLoadingTransactions = true;
        }
      })
      .addCase(fetchTransactionsPageThunk.fulfilled, (state, action) => {
        state.isLoadingTransactions = false;
        state.isLoadingMoreTransactions = false;
        state.transactions = action.payload.append
          ? [...state.transactions, ...action.payload.items]
          : action.payload.items;
        state.transactionsTotal = action.payload.total;
        state.transactionsHasMore = action.payload.hasMore;
      })
      .addCase(fetchTransactionsPageThunk.rejected, (state) => {
        state.isLoadingTransactions = false;
        state.isLoadingMoreTransactions = false;
      })
      .addCase(fetchPortfolioEquityHistoryThunk.fulfilled, (state, action) => {
        if (action.payload.length > 0) {
          state.equityHistory = action.payload;
        }
      })
      .addCase(refreshHoldingsQuotesThunk.fulfilled, (state, action) => {
        state.summaryPositions = action.payload.summaryPositions;
        state.positions = action.payload.positions;
      })
      .addCase(refreshHoldingsQuotesThunk.rejected, (state, action) => {
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      });
  },
});

export const { syncHoldingsQuotes } = portfolioSlice.actions;
export const portfolioReducer = portfolioSlice.reducer;
