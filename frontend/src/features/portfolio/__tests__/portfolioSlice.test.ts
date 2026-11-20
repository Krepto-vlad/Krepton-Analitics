import { configureStore } from '@reduxjs/toolkit';
import {
  closePortfolioPosition,
  createPortfolioPosition,
  deleteBuyTransaction,
  deletePortfolioPosition,
  fetchInvestmentSummary,
  fetchPortfolioEquityHistory,
  fetchPortfolioNews,
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioRebalancing,
  fetchPortfolioTransactionsPage,
} from '../../../api/portfolioApi';
import { fetchLiveFxRates } from '../../../api/fxApi';
import { fetchStockQuotesBatch } from '../../../api/stockApi';
import type { AppDispatch } from '../../../store';
import { authReducer } from '../../auth/authSlice';
import { uiReducer } from '../../ui/uiSlice';
import { watchlistReducer } from '../../watchlist/watchlistSlice';
import {
  addPositionThunk,
  closePositionThunk,
  deleteBuyTransactionThunk,
  deletePositionThunk,
  fetchInvestmentSummaryThunk,
  fetchPortfolioEquityHistoryThunk,
  fetchPortfolioNewsThunk,
  fetchPortfolioPositionsThunk,
  fetchPortfolioRebalancingThunk,
  fetchPortfolioSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
  portfolioReducer,
  refreshHoldingsQuotesThunk,
  syncHoldingsQuotes,
} from '../portfolioSlice';
import {
  selectIsDashboardBootstrapping,
  selectPortfolioStats,
  selectSectorAllocations,
} from '../portfolioSelectors';
import type { StoredPosition } from '../../../api/portfolioApi';
import type { RebalancingAnalysisResponse } from '../../../types/rebalancing.types';

jest.mock('../../../api/portfolioApi', () => ({
  fetchPortfolioPositions: jest.fn(),
  fetchPortfolioPositionsPage: jest.fn(),
  fetchPortfolioTransactionsPage: jest.fn(),
  fetchInvestmentSummary: jest.fn(),
  fetchPortfolioEquityHistory: jest.fn(),
  fetchPortfolioNews: jest.fn(),
  fetchPortfolioRebalancing: jest.fn(),
  createPortfolioPosition: jest.fn(),
  deletePortfolioPosition: jest.fn(),
  deleteBuyTransaction: jest.fn(),
  closePortfolioPosition: jest.fn(),
}));

jest.mock('../../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn(),
}));

jest.mock('../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn(),
}));

const stored: StoredPosition = {
  id: 'p1',
  ticker: 'AAPL',
  companyName: 'Apple',
  shares: 2,
  avgBuyPrice: 100,
  currency: 'USD',
  sector: 'Technology',
  entryDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const quote = {
  ticker: 'AAPL',
  name: 'Apple',
  price: 150,
  change: 1,
  changePercent: 1,
  volume: 1,
  marketCap: 1,
  currency: 'USD',
  fiftyTwoWeekHigh: 160,
  fiftyTwoWeekLow: 90,
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

const rebalancing: RebalancingAnalysisResponse = {
  strategyId: 'custom',
  strategyName: 'Custom',
  strategyDescription: 'Custom mix',
  strategyPhilosophy: 'Stay invested',
  investmentHorizon: 'Long term',
  customBaseStrategyId: null,
  savedCustomStrategy: null,
  includePermanentCash: true,
  displayCurrency: 'USD',
  alignmentScore: 80,
  totalPortfolioValue: 300,
  currentAllocations: [],
  targetAllocations: [],
  deviations: [],
  tickerMappings: [
    {
      ticker: 'AAPL',
      sector: 'Technology',
      marketValue: 300,
      bucketId: 'equities',
      bucketLabel: 'Equities',
      inferredAssetClass: 'equity',
      mappingSource: 'sector',
    },
  ],
};

function createStore() {
  return configureStore({
    reducer: {
      portfolio: portfolioReducer,
      auth: authReducer,
      ui: uiReducer,
      watchlist: watchlistReducer,
    },
  });
}

function dispatch(store: ReturnType<typeof createStore>) {
  return store.dispatch as AppDispatch;
}

describe('portfolioSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchStockQuotesBatch).mockResolvedValue([quote]);
    jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
  });

  it('loads summary, pages, transactions, equity, news, and rebalancing', async () => {
    jest.mocked(fetchPortfolioPositions).mockResolvedValue([stored]);
    jest.mocked(fetchPortfolioPositionsPage).mockResolvedValue({
      items: [stored],
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
    jest.mocked(fetchPortfolioTransactionsPage).mockResolvedValue({
      items: [
        {
          id: 't1',
          ticker: 'AAPL',
          companyName: 'Apple',
          shares: 2,
          pricePerShare: 100,
          currency: 'USD',
          transactionDate: '2026-01-01',
          transactionType: 'BUY',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 5,
      offset: 0,
      hasMore: false,
    });
    jest
      .mocked(fetchInvestmentSummary)
      .mockResolvedValue({ totalInvested: 200, totalWithdrawn: 0 });
    jest
      .mocked(fetchPortfolioEquityHistory)
      .mockResolvedValue([{ time: '2026-01-01', value: 300 }]);
    jest.mocked(fetchPortfolioNews).mockResolvedValue([]);
    jest.mocked(fetchPortfolioRebalancing).mockResolvedValue(rebalancing);

    const store = createStore();
    await dispatch(store)(fetchPortfolioSummaryThunk());
    await dispatch(store)(fetchPortfolioPositionsThunk());
    await dispatch(store)(fetchPositionsPageThunk({ offset: 0, append: false }));
    await dispatch(store)(fetchTransactionsPageThunk({ offset: 0, append: false }));
    await dispatch(store)(fetchInvestmentSummaryThunk());
    await dispatch(store)(fetchPortfolioEquityHistoryThunk());
    await dispatch(store)(fetchPortfolioNewsThunk());
    await dispatch(store)(fetchPortfolioRebalancingThunk());

    const state = store.getState();
    expect(state.portfolio.summaryPositions[0]?.currentPrice).toBe(150);
    expect(selectPortfolioStats(state as never).totalValue).toBe(300);
    expect(selectSectorAllocations(state as never)[0]?.sector).toBe('Technology');
    expect(state.portfolio.portfolioHealth.alignmentScore).toBe(80);
    expect(selectIsDashboardBootstrapping(state as never)).toBe(true);
  });

  it('refreshes quotes and mutates positions', async () => {
    jest.mocked(fetchPortfolioPositions).mockResolvedValue([]);
    jest.mocked(fetchInvestmentSummary).mockResolvedValue({ totalInvested: 0, totalWithdrawn: 0 });
    jest.mocked(fetchPortfolioPositionsPage).mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
    jest.mocked(fetchPortfolioTransactionsPage).mockResolvedValue({
      items: [],
      total: 0,
      limit: 5,
      offset: 0,
      hasMore: false,
    });
    jest.mocked(fetchPortfolioEquityHistory).mockResolvedValue([]);
    jest.mocked(fetchPortfolioNews).mockResolvedValue([]);
    jest.mocked(fetchPortfolioRebalancing).mockResolvedValue({
      ...rebalancing,
      totalPortfolioValue: 0,
      tickerMappings: [],
    });
    jest.mocked(createPortfolioPosition).mockResolvedValue(stored);
    jest.mocked(deletePortfolioPosition).mockResolvedValue(undefined);
    jest.mocked(deleteBuyTransaction).mockResolvedValue(undefined);
    jest
      .mocked(closePortfolioPosition)
      .mockResolvedValue({ success: true, data: null, closed: true });

    const store = createStore();
    store.dispatch(
      syncHoldingsQuotes({
        summaryPositions: [
          {
            id: 'p1',
            ticker: 'AAPL',
            companyName: 'Apple',
            shares: 2,
            avgBuyPrice: 100,
            currency: 'USD',
            sector: 'Technology',
            entryDate: '2026-01-01',
            currentPrice: 100,
            logoUrl: null,
          },
        ],
        positions: [],
      })
    );

    await dispatch(store)(refreshHoldingsQuotesThunk());
    expect(store.getState().portfolio.summaryPositions[0]?.currentPrice).toBe(150);

    await dispatch(store)(
      addPositionThunk({
        ticker: 'AAPL',
        companyName: 'Apple',
        shares: 1,
        avgBuyPrice: 100,
        currency: 'USD',
      })
    );
    await dispatch(store)(deletePositionThunk('p1'));
    await dispatch(store)(deleteBuyTransactionThunk('t1'));
    await dispatch(store)(
      closePositionThunk({
        positionId: 'p1',
        payload: { shares: 2, pricePerShare: 150, currency: 'USD' },
      })
    );

    expect(createPortfolioPosition).toHaveBeenCalled();
    expect(deletePortfolioPosition).toHaveBeenCalledWith('p1');
  });

  it('records load failures', async () => {
    jest.mocked(fetchPortfolioPositions).mockRejectedValue(new Error('down'));
    const store = createStore();
    await dispatch(store)(fetchPortfolioSummaryThunk());
    expect(store.getState().portfolio.error).toBe('down');
  });
});
