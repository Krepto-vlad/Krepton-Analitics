import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchPortfolioNews, fetchPortfolioRebalancing } from '../../../api/portfolioApi';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { loadChatScreenContext } from '../../../utils/tickerChatSession';
import { DashboardPage } from '../DashboardPage';

jest.mock('../../../hooks/useLivePollingScope', () => ({
  useDashboardLivePollingScopes: jest.fn(),
}));

jest.mock('../../../api/portfolioApi', () => ({
  fetchPortfolioRebalancing: jest.fn().mockResolvedValue({
    strategyId: 'ray-dalio-all-weather',
    strategyName: 'All Weather',
    strategyDescription: '',
    strategyPhilosophy: '',
    investmentHorizon: '',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    includePermanentCash: true,
    displayCurrency: 'USD',
    totalPortfolioValue: 1500,
    alignmentScore: 80,
    targetAllocations: [],
    currentAllocations: [],
    deviations: [],
    tickerMappings: [],
  }),
  fetchPortfolioNews: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../components/PortfolioHealthCard/PortfolioHealthCard', () => ({
  PortfolioHealthCard: (props: { strategyName: string | null; isLoading: boolean }) => (
    <div>
      Health {props.strategyName ?? 'empty'}
      {props.isLoading ? ' loading' : ''}
    </div>
  ),
}));

jest.mock('../components/PortfolioEquityCard/PortfolioEquityCard', () => ({
  PortfolioEquityCard: () => <div>Equity card</div>,
}));

jest.mock('../components/PositionsTable/PositionsTable', () => ({
  PositionsTable: ({ positions }: { positions: Array<{ ticker: string }> }) => (
    <div>Positions {positions.map((position) => position.ticker).join(',') || 'none'}</div>
  ),
}));

jest.mock('../components/WatchlistPanel/WatchlistPanel', () => ({
  WatchlistPanel: ({ watchlist }: { watchlist: Array<{ ticker: string }> }) => (
    <div>Watchlist {watchlist.map((item) => item.ticker).join(',') || 'none'}</div>
  ),
}));

jest.mock('../components/NewsFeed/NewsFeed', () => ({
  NewsFeed: (props: {
    error: string | null;
    onRetry: () => void;
    hasPortfolioHoldings: boolean;
  }) => (
    <div>
      News {props.hasPortfolioHoldings ? 'with holdings' : 'empty'}
      {props.error ? ` error:${props.error}` : ''}
      <button type="button" onClick={props.onRetry}>
        Retry news
      </button>
    </div>
  ),
}));

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
  logoUrl: 'https://example.com/aapl.png',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders dashboard panels for an empty account', async () => {
    renderWithProviders(<DashboardPage />, {
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

    expect(screen.getByText(/Health empty/)).toBeInTheDocument();
    expect(screen.getByText('Equity card')).toBeInTheDocument();
    expect(screen.getByText('Positions none')).toBeInTheDocument();
    expect(screen.getByText('News empty')).toBeInTheDocument();
    expect(fetchPortfolioNews).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(loadChatScreenContext()).toEqual({ kind: 'portfolio', displayCurrency: 'USD' });
    });
  });

  it('loads news for holdings, shows errors, and retries', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />, {
      preloadedState: {
        watchlist: {
          items: [
            {
              id: 'w-1',
              ticker: 'MSFT',
              companyName: 'Microsoft',
              price: 400,
              changePercent: 1,
              currency: 'USD',
              fiftyTwoWeekHigh: 450,
              fiftyTwoWeekLow: 300,
              logoUrl: null,
            },
          ],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: 'Watchlist stale',
        },
        portfolio: {
          positions: [applePosition],
          positionsTotal: 1,
          positionsHasMore: false,
          isLoadingMorePositions: false,
          summaryPositions: [applePosition],
          investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
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
            totalPnlPercent: 50,
            dayPnlPercent: 0,
          },
          sectorAllocations: [],
          news: [],
          isLoadingNews: false,
          newsError: 'News failed',
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
          error: 'Portfolio stale',
        },
      },
    });

    expect(screen.getByText('Portfolio stale')).toBeInTheDocument();
    expect(screen.getByText(/News with holdings/)).toBeInTheDocument();
    expect(screen.getByText('Positions AAPL')).toBeInTheDocument();
    expect(screen.getByText('Watchlist MSFT')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry news' }));
    expect(fetchPortfolioNews).toHaveBeenCalled();
    expect(fetchPortfolioRebalancing).toHaveBeenCalled();
  });
});
