import { createSlice, createAsyncThunk, isAnyOf } from '@reduxjs/toolkit';
import type {
  PortfolioState,
  PortfolioPosition,
  EquityDataPoint,
  NewsItem,
} from '../../types/portfolio.types';
import {
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioTransactionsPage,
  fetchPortfolioEquityHistory as apiFetchEquityHistory,
  fetchInvestmentSummary as apiFetchInvestmentSummary,
  fetchPortfolioNews as apiFetchPortfolioNews,
  fetchPortfolioRebalancing as apiFetchPortfolioRebalancing,
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
import type { RebalancingAnalysisResponse } from '../../types/rebalancing.types';
import { HOLDINGS_PAGE_SIZE, TRANSACTIONS_PAGE_SIZE, type Currency } from '../../constants';
import {
  convertAmountWithRate,
  getTodayIsoDate,
  resolveEquityHistoryForDisplay,
} from '../../utils/moneyDisplay';
import { googleLoginThunk, loginThunk, logoutThunk, verifyEmailThunk } from '../auth/authSlice';

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
      logoUrl: quote?.logoUrl ?? null,
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
      logoUrl: quote.logoUrl ?? position.logoUrl ?? null,
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
    dispatch(fetchPortfolioNewsThunk()),
    dispatch(fetchPortfolioRebalancingThunk()),
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

export const fetchPortfolioRebalancingThunk = createAsyncThunk<
  RebalancingAnalysisResponse,
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchRebalancing', async (_, { getState, rejectWithValue }) => {
  const displayCurrency = getState().ui.currency;
  try {
    return await apiFetchPortfolioRebalancing(displayCurrency);
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_REBALANCING_FAILED));
  }
});

export const fetchPortfolioNewsThunk = createAsyncThunk<
  NewsItem[],
  void,
  { rejectValue: string; state: RootState }
>('portfolio/fetchNews', async (_, { rejectWithValue }) => {
  try {
    return await apiFetchPortfolioNews();
  } catch (error) {
    return rejectWithValue(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_NEWS_FAILED));
  }
});

// ─── Initial state ────────────────────────────────────────────────────────────

const EMPTY_PORTFOLIO_STATS = {
  totalValue: 0,
  totalPnl: 0,
  unrealizedPnl: 0,
  realizedPnl: 0,
  dayPnl: 0,
  totalPnlPercent: 0,
  dayPnlPercent: 0,
};

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
  stats: EMPTY_PORTFOLIO_STATS,
  sectorAllocations: [],
  news: [],
  isLoadingNews: false,
  newsError: null,
  equityHistory: [],
  portfolioHealth: {
    alignmentScore: null,
    strategyId: null,
    strategyName: null,
    deviations: [],
    isLoading: false,
    error: null,
  },
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
        state.equityHistory = action.payload;
      })
      .addCase(refreshHoldingsQuotesThunk.fulfilled, (state, action) => {
        state.summaryPositions = action.payload.summaryPositions;
        state.positions = action.payload.positions;
      })
      .addCase(refreshHoldingsQuotesThunk.rejected, (state, action) => {
        state.error = action.payload ?? ERROR_MESSAGES.UNKNOWN;
      })
      .addCase(fetchPortfolioNewsThunk.pending, (state) => {
        state.isLoadingNews = true;
        state.newsError = null;
      })
      .addCase(fetchPortfolioNewsThunk.fulfilled, (state, action) => {
        state.isLoadingNews = false;
        state.news = action.payload;
      })
      .addCase(fetchPortfolioNewsThunk.rejected, (state, action) => {
        state.isLoadingNews = false;
        state.newsError = action.payload ?? ERROR_MESSAGES.PORTFOLIO_NEWS_FAILED;
      })
      .addCase(fetchPortfolioRebalancingThunk.pending, (state) => {
        state.portfolioHealth.isLoading = true;
        state.portfolioHealth.error = null;
      })
      .addCase(fetchPortfolioRebalancingThunk.fulfilled, (state, action) => {
        state.portfolioHealth.isLoading = false;
        state.portfolioHealth.strategyId = action.payload.strategyId;
        state.portfolioHealth.strategyName = action.payload.strategyName;

        const hasHoldings =
          action.payload.totalPortfolioValue > 0 && action.payload.tickerMappings.length > 0;

        // Keep the gauge/alert empty until the user has real portfolio data.
        state.portfolioHealth.alignmentScore = hasHoldings ? action.payload.alignmentScore : null;
        state.portfolioHealth.deviations = hasHoldings ? action.payload.deviations : [];
      })
      .addCase(fetchPortfolioRebalancingThunk.rejected, (state, action) => {
        state.portfolioHealth.isLoading = false;
        state.portfolioHealth.error = action.payload ?? ERROR_MESSAGES.PORTFOLIO_REBALANCING_FAILED;
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

export const { syncHoldingsQuotes } = portfolioSlice.actions;
export const portfolioReducer = portfolioSlice.reducer;
