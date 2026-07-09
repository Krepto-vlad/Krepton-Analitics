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
} from '../../api/portfolioApi';
import { fetchStockQuote } from '../../api/stockApi';
import { HOLDINGS_PAGE_SIZE, TRANSACTIONS_PAGE_SIZE } from '../../constants';

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

async function enrichStoredPositions(stored: StoredPosition[]): Promise<PortfolioPosition[]> {
  if (stored.length === 0) return [];

  const uniqueTickers = [...new Set(stored.map((position) => position.ticker))];
  const priceResults = await Promise.allSettled(
    uniqueTickers.map((ticker) => fetchStockQuote(ticker))
  );

  const priceMap: Record<string, number> = {};
  priceResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      priceMap[uniqueTickers[index]] = result.value.price;
    }
  });

  return stored.map(
    (storedPosition): PortfolioPosition => ({
      id: storedPosition.id,
      ticker: storedPosition.ticker,
      companyName: storedPosition.companyName,
      shares: storedPosition.shares,
      avgBuyPrice: storedPosition.avgBuyPrice,
      currency: storedPosition.currency,
      sector: storedPosition.sector,
      entryDate: storedPosition.entryDate,
      currentPrice: priceMap[storedPosition.ticker] ?? storedPosition.avgBuyPrice,
    })
  );
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
  { rejectValue: string }
>('portfolio/fetchPositions', async (_, { rejectWithValue }) => {
  try {
    const stored = await fetchPortfolioPositions();
    return enrichStoredPositions(stored);
  } catch {
    return rejectWithValue('Failed to load portfolio positions');
  }
});

/** All positions for portfolio page summary cards and charts. */
export const fetchPortfolioSummaryThunk = createAsyncThunk<
  PortfolioPosition[],
  void,
  { rejectValue: string }
>('portfolio/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const stored = await fetchPortfolioPositions();
    return enrichStoredPositions(stored);
  } catch {
    return rejectWithValue('Failed to load portfolio summary');
  }
});

export const fetchInvestmentSummaryThunk = createAsyncThunk<
  InvestmentSummary,
  void,
  { rejectValue: string }
>('portfolio/fetchInvestmentSummary', async (_, { rejectWithValue }) => {
  try {
    return await apiFetchInvestmentSummary();
  } catch {
    return rejectWithValue('Failed to load investment summary');
  }
});

export const fetchPositionsPageThunk = createAsyncThunk<
  { items: PortfolioPosition[]; total: number; hasMore: boolean; append: boolean },
  { offset: number; append: boolean },
  { rejectValue: string }
>('portfolio/fetchPositionsPage', async ({ offset, append }, { rejectWithValue }) => {
  try {
    const page = await fetchPortfolioPositionsPage(HOLDINGS_PAGE_SIZE, offset);
    const items = await enrichStoredPositions(page.items);
    return { items, total: page.total, hasMore: page.hasMore, append };
  } catch {
    return rejectWithValue('Failed to load holdings');
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
  { rejectValue: string }
>('portfolio/fetchTransactionsPage', async ({ offset, append }, { rejectWithValue }) => {
  try {
    const page = await fetchPortfolioTransactionsPage(TRANSACTIONS_PAGE_SIZE, offset);
    return {
      items: page.items,
      total: page.total,
      hasMore: page.hasMore,
      append,
    };
  } catch {
    return rejectWithValue('Failed to load transaction history');
  }
});

export const fetchPortfolioEquityHistoryThunk = createAsyncThunk<
  EquityDataPoint[],
  void,
  { rejectValue: string }
>('portfolio/fetchEquityHistory', async (_, { rejectWithValue }) => {
  try {
    const points = await apiFetchEquityHistory();
    return points;
  } catch {
    return rejectWithValue('Failed to load equity history');
  }
});

export const deletePositionThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  'portfolio/deletePosition',
  async (positionId, { dispatch, rejectWithValue }) => {
    try {
      await apiDeletePosition(positionId);
      await refreshPortfolioData(dispatch);
      return positionId;
    } catch {
      return rejectWithValue('Failed to delete position');
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
    } catch {
      return rejectWithValue('Failed to remove purchase');
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
  } catch {
    return rejectWithValue('Failed to close position');
  }
});

export const addPositionThunk = createAsyncThunk<void, AddPositionPayload, { rejectValue: string }>(
  'portfolio/addPosition',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      await createPortfolioPosition(payload);
      await refreshPortfolioData(dispatch);
    } catch {
      return rejectWithValue('Failed to add position');
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
  watchlist: [
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      price: 213.4,
      changePercent: 2.15,
      alertType: 'BUY',
    },
    {
      ticker: 'SBER',
      companyName: 'Sberbank PJSC',
      price: 3.15,
      changePercent: -0.32,
      alertType: 'SELL',
    },
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corp.',
      price: 447.98,
      changePercent: -0.09,
      alertType: null,
    },
    {
      ticker: 'NVDA',
      companyName: 'Nvidia Corp.',
      price: 875.48,
      changePercent: 1.9,
      alertType: 'BUY',
    },
    {
      ticker: 'GAZP',
      companyName: 'Gazprom PAO',
      price: 1.48,
      changePercent: -8.72,
      alertType: 'SELL',
    },
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      price: 168.78,
      changePercent: 3.47,
      alertType: null,
    },
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
  reducers: {},
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
        state.error = action.payload ?? 'Unknown error';
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
        state.error = action.payload ?? 'Unknown error';
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
        state.error = action.payload ?? 'Unknown error';
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
      });
  },
});

export const portfolioReducer = portfolioSlice.reducer;
