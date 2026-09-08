import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockBacktest } from '../../../api/stockApi';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import type { StockBacktestResponse } from '../../../types/stock.types';
import { BacktestingPage } from '../BacktestingPage';

jest.mock('../../../api/stockApi', () => ({
  fetchStockBacktest: jest.fn(),
  fetchStockSearch: jest.fn(),
}));

jest.mock('../components/BacktestInputPanel/BacktestInputPanel', () => ({
  BacktestInputPanel: (props: {
    isCalculating: boolean;
    canLoadFromPortfolio: boolean;
    onAddTicker: (ticker: { ticker: string; name: string }) => void;
    onRemoveTicker: (ticker: string) => void;
    onWeightChange: (ticker: string, weightPercent: number) => void;
    onLoadFromPortfolio: () => void;
    onPeriodChange: (period: string) => void;
    onAmountChange: (amount: number) => void;
    onCalculate: () => void;
    selectedTickers: Array<{ ticker: string }>;
  }) => (
    <div>
      <p>Selected: {props.selectedTickers.map((item) => item.ticker).join(',') || 'none'}</p>
      <button type="button" onClick={() => props.onAddTicker({ ticker: 'AAPL', name: 'Apple' })}>
        Add AAPL
      </button>
      <button type="button" onClick={() => props.onAddTicker({ ticker: 'AAPL', name: 'Apple' })}>
        Add AAPL again
      </button>
      <button
        type="button"
        onClick={() => props.onAddTicker({ ticker: 'MSFT', name: 'Microsoft' })}
      >
        Add MSFT
      </button>
      <button type="button" onClick={() => props.onRemoveTicker('MSFT')}>
        Remove MSFT
      </button>
      <button type="button" onClick={() => props.onWeightChange('AAPL', 60)}>
        Weight AAPL
      </button>
      <button
        type="button"
        onClick={props.onLoadFromPortfolio}
        disabled={!props.canLoadFromPortfolio}
      >
        Load portfolio
      </button>
      <button type="button" onClick={() => props.onPeriodChange('1y')}>
        Period 1Y
      </button>
      <button type="button" onClick={() => props.onAmountChange(5000)}>
        Amount 5000
      </button>
      <button type="button" onClick={props.onCalculate}>
        {props.isCalculating ? 'Calculating…' : 'Calculate'}
      </button>
    </div>
  ),
}));

jest.mock('../components/BacktestResults/BacktestResults', () => ({
  BacktestResults: ({ data }: { data: StockBacktestResponse }) => (
    <div>Results {data.periodLabel}</div>
  ),
}));

const backtestResponse: StockBacktestResponse = {
  amount: 1000,
  displayCurrency: 'USD',
  period: '3y',
  periodLabel: '3 Years',
  portfolio: { returnPercent: 20, finalValue: 1200, currency: 'USD' },
  holdings: [],
  benchmark: {
    label: 'S&P 500',
    ticker: 'SPY',
    returnPercent: 15,
    finalValue: 1150,
    currency: 'USD',
  },
  periodBreakdown: [],
};

const applePosition = {
  id: 'p-1',
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  shares: 10,
  avgBuyPrice: 100,
  entryDate: '2024-01-01',
  currentPrice: 150,
  currency: 'USD',
  sector: 'Technology',
  logoUrl: null,
};

describe('BacktestingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty state and hydrates watchlist/portfolio when needed', () => {
    renderWithProviders(<BacktestingPage />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
        portfolio: {
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
            totalValue: 0,
            totalPnl: 0,
            unrealizedPnl: 0,
            realizedPnl: 0,
            dayPnl: 0,
            totalPnlPercent: 0,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: null,
          hasHydratedNews: true,
          equityHistory: [],
          isLoadingEquityHistory: false,
          hasHydratedSummary: true,
          hasHydratedEquityHistory: true,
          portfolioHealth: {
            alignmentScore: null,
            strategyId: null,
            strategyName: null,
            deviations: [],
            isLoading: false,
            hasHydrated: true,
            error: null,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.getByText(/Build a weighted portfolio/)).toBeInTheDocument();
  });

  it('calculates a backtest after adding tickers', async () => {
    jest.mocked(fetchStockBacktest).mockResolvedValue(backtestResponse);
    const user = userEvent.setup();
    renderWithProviders(<BacktestingPage />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
        portfolio: {
          positions: [],
          positionsTotal: 0,
          positionsHasMore: false,
          isLoadingMorePositions: false,
          summaryPositions: [applePosition],
          investmentSummary: { totalInvested: 0, totalWithdrawn: 0 },
          transactions: [],
          transactionsTotal: 0,
          transactionsHasMore: false,
          isLoadingTransactions: false,
          isLoadingMoreTransactions: false,
          stats: {
            totalValue: 1500,
            totalPnl: 500,
            unrealizedPnl: 500,
            realizedPnl: 0,
            dayPnl: 0,
            totalPnlPercent: 0,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: null,
          hasHydratedNews: true,
          equityHistory: [],
          isLoadingEquityHistory: false,
          hasHydratedSummary: true,
          hasHydratedEquityHistory: true,
          portfolioHealth: {
            alignmentScore: 80,
            strategyId: 'ray-dalio-all-weather',
            strategyName: 'All Weather',
            deviations: [],
            isLoading: false,
            hasHydrated: true,
            error: null,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Add AAPL' }));
    await user.click(screen.getByRole('button', { name: 'Add AAPL again' }));
    await user.click(screen.getByRole('button', { name: 'Add MSFT' }));
    await user.click(screen.getByRole('button', { name: 'Remove MSFT' }));
    await user.click(screen.getByRole('button', { name: 'Weight AAPL' }));
    await user.click(screen.getByRole('button', { name: 'Period 1Y' }));
    await user.click(screen.getByRole('button', { name: 'Amount 5000' }));
    await user.click(screen.getByRole('button', { name: 'Calculate' }));

    expect(await screen.findByText('Results 3 Years')).toBeInTheDocument();
    expect(fetchStockBacktest).toHaveBeenCalled();
  });

  it('shows a calculation error and a loading skeleton', async () => {
    let resolveBacktest: (value: StockBacktestResponse) => void = () => undefined;
    jest.mocked(fetchStockBacktest).mockReturnValue(
      new Promise((resolve) => {
        resolveBacktest = resolve;
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<BacktestingPage />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
        portfolio: {
          positions: [],
          positionsTotal: 0,
          positionsHasMore: false,
          isLoadingMorePositions: false,
          summaryPositions: [applePosition],
          investmentSummary: { totalInvested: 0, totalWithdrawn: 0 },
          transactions: [],
          transactionsTotal: 0,
          transactionsHasMore: false,
          isLoadingTransactions: false,
          isLoadingMoreTransactions: false,
          stats: {
            totalValue: 1500,
            totalPnl: 500,
            unrealizedPnl: 500,
            realizedPnl: 0,
            dayPnl: 0,
            totalPnlPercent: 0,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: null,
          hasHydratedNews: true,
          equityHistory: [],
          isLoadingEquityHistory: false,
          hasHydratedSummary: true,
          hasHydratedEquityHistory: true,
          portfolioHealth: {
            alignmentScore: null,
            strategyId: null,
            strategyName: null,
            deviations: [],
            isLoading: false,
            hasHydrated: true,
            error: null,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Add AAPL' }));
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(
      screen.getByRole('status', { name: LOADING_MESSAGES.BACKTEST_CALCULATION })
    ).toBeInTheDocument();
    resolveBacktest(backtestResponse);
    expect(await screen.findByText('Results 3 Years')).toBeInTheDocument();

    jest.mocked(fetchStockBacktest).mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(await screen.findByText(ERROR_MESSAGES.STOCK_BACKTEST_FAILED)).toBeInTheDocument();
  });

  it('loads allocations from the portfolio or asks the user to add positions first', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BacktestingPage />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
        portfolio: {
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
            totalValue: 0,
            totalPnl: 0,
            unrealizedPnl: 0,
            realizedPnl: 0,
            dayPnl: 0,
            totalPnlPercent: 0,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: null,
          hasHydratedNews: true,
          equityHistory: [],
          isLoadingEquityHistory: false,
          hasHydratedSummary: true,
          hasHydratedEquityHistory: true,
          portfolioHealth: {
            alignmentScore: null,
            strategyId: null,
            strategyName: null,
            deviations: [],
            isLoading: false,
            hasHydrated: true,
            error: null,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.getByRole('button', { name: 'Load portfolio' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.queryByText(ERROR_MESSAGES.STOCK_BACKTEST_FAILED)).not.toBeInTheDocument();
  });

  it('loads current holdings into the backtest form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BacktestingPage />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
        portfolio: {
          positions: [],
          positionsTotal: 0,
          positionsHasMore: false,
          isLoadingMorePositions: false,
          summaryPositions: [applePosition],
          investmentSummary: { totalInvested: 0, totalWithdrawn: 0 },
          transactions: [],
          transactionsTotal: 0,
          transactionsHasMore: false,
          isLoadingTransactions: false,
          isLoadingMoreTransactions: false,
          stats: {
            totalValue: 1500,
            totalPnl: 500,
            unrealizedPnl: 500,
            realizedPnl: 0,
            dayPnl: 0,
            totalPnlPercent: 0,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: null,
          hasHydratedNews: true,
          equityHistory: [],
          isLoadingEquityHistory: false,
          hasHydratedSummary: true,
          hasHydratedEquityHistory: true,
          portfolioHealth: {
            alignmentScore: null,
            strategyId: null,
            strategyName: null,
            deviations: [],
            isLoading: false,
            hasHydrated: true,
            error: null,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Load portfolio' }));
    expect(screen.getByText('Selected: AAPL')).toBeInTheDocument();
  });
});
