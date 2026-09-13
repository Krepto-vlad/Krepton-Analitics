import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EQUITY_PERIODS,
  ERROR_MESSAGES,
  HOLDINGS_PAGE_SIZE,
  LOADING_MESSAGES,
  TRANSACTIONS_PAGE_SIZE,
  buildTickerDetailPath,
} from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { PortfolioPosition, PortfolioTransaction } from '../../../../../types/portfolio.types';
import {
  deleteBuyTransaction,
  deletePortfolioPosition,
  fetchInvestmentSummary,
  fetchPortfolioEquityHistory,
  fetchPortfolioNews,
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioRebalancing,
  fetchPortfolioTransactionsPage,
} from '../../../../../api/portfolioApi';
import { fetchLiveFxRates } from '../../../../../api/fxApi';
import { fetchStockQuotesBatch } from '../../../../../api/stockApi';
import { PositionsPanel } from '../PositionsPanel';

jest.mock('../../../../../hooks/useEquityChart', () => ({
  useEquityChart: () => ({
    containerRef: { current: null },
    selectedPeriod: '1Y',
    setSelectedPeriod: jest.fn(),
    filteredHistory: [],
    currentValue: 12_500,
  }),
  formatChartPrice: (value: number, currency = 'USD') => `${currency} ${value}`,
}));

jest.mock('../../AddPositionModal/AddPositionModal', () => ({
  AddPositionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="Add position">
        <button type="button" onClick={onClose}>
          Close add modal
        </button>
      </div>
    ) : null,
}));

jest.mock('../../DeleteConfirmModal/DeleteConfirmModal', () => ({
  DeleteConfirmModal: ({
    isOpen,
    ticker,
    onDeleteAll,
    onDeleteBuy,
    onSellInstead,
    onClose,
    isDeletingAll,
  }: {
    isOpen: boolean;
    ticker: string;
    onDeleteAll: () => void;
    onDeleteBuy: (transactionId: string) => Promise<void>;
    onSellInstead: () => void;
    onClose: () => void;
    isDeletingAll: boolean;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Delete position">
        <p>{ticker}</p>
        <button type="button" onClick={() => void onDeleteAll()} disabled={isDeletingAll}>
          Confirm delete all
        </button>
        <button type="button" onClick={() => void onDeleteBuy('buy-1')}>
          Delete buy
        </button>
        <button type="button" onClick={onSellInstead}>
          Sell instead
        </button>
        <button type="button" onClick={onClose}>
          Cancel delete
        </button>
      </div>
    ) : null,
}));

jest.mock('../../ClosePositionModal/ClosePositionModal', () => ({
  ClosePositionModal: ({
    isOpen,
    position,
    onClose,
  }: {
    isOpen: boolean;
    position: PortfolioPosition | null;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Close position">
        <p>{position?.ticker}</p>
        <button type="button" onClick={onClose}>
          Close sell modal
        </button>
      </div>
    ) : null,
}));

jest.mock('../../../../../api/portfolioApi', () => ({
  deletePortfolioPosition: jest.fn(),
  deleteBuyTransaction: jest.fn(),
  fetchPortfolioPositions: jest.fn(),
  fetchPortfolioPositionsPage: jest.fn(),
  fetchPortfolioTransactionsPage: jest.fn(),
  fetchInvestmentSummary: jest.fn(),
  fetchPortfolioEquityHistory: jest.fn(),
  fetchPortfolioNews: jest.fn(),
  fetchPortfolioRebalancing: jest.fn(),
}));

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn(),
}));

jest.mock('../../../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn(),
}));

const APPLE_TICKER = 'AAPL';
const MICROSOFT_TICKER = 'MSFT';
const APPLE_COMPANY_NAME = 'Apple Inc.';
const MICROSOFT_COMPANY_NAME = 'Microsoft Corp.';
const BUY_TRANSACTION_ID = 'buy-1';
const EMPTY_PAGE = {
  items: [],
  total: 0,
  offset: 0,
  hasMore: false,
};

const applePosition: PortfolioPosition = {
  id: 'position-apple',
  ticker: APPLE_TICKER,
  companyName: APPLE_COMPANY_NAME,
  shares: 10,
  avgBuyPrice: 100,
  entryDate: '2026-01-01',
  currentPrice: 150,
  currency: 'USD',
  sector: 'Technology',
  logoUrl: null,
};

const microsoftPosition: PortfolioPosition = {
  id: 'position-microsoft',
  ticker: MICROSOFT_TICKER,
  companyName: MICROSOFT_COMPANY_NAME,
  shares: 5,
  avgBuyPrice: 200,
  entryDate: '2026-02-01',
  currentPrice: 180,
  currency: 'USD',
  sector: 'Technology',
  logoUrl: null,
};

const energyPosition: PortfolioPosition = {
  id: 'position-energy',
  ticker: 'XOM',
  companyName: 'Exxon Mobil',
  shares: 8,
  avgBuyPrice: 50,
  entryDate: '2026-03-01',
  currentPrice: 60,
  currency: 'USD',
  sector: null,
  logoUrl: null,
};

const buyTransaction: PortfolioTransaction = {
  id: BUY_TRANSACTION_ID,
  ticker: APPLE_TICKER,
  companyName: APPLE_COMPANY_NAME,
  shares: 10,
  pricePerShare: 100,
  currency: 'USD',
  transactionDate: '2026-01-15',
  transactionType: 'BUY',
  createdAt: '2026-01-16T00:00:00.000Z',
};

const sellTransaction: PortfolioTransaction = {
  id: 'sell-1',
  ticker: MICROSOFT_TICKER,
  companyName: MICROSOFT_COMPANY_NAME,
  shares: 2,
  pricePerShare: 190,
  currency: 'USD',
  transactionDate: '2026-03-15T12:00:00.000Z',
  transactionType: 'SELL',
  createdAt: '2026-03-16T00:00:00.000Z',
  displayTotalAmount: 400,
};

const invalidDateTransaction: PortfolioTransaction = {
  id: 'buy-2',
  ticker: APPLE_TICKER,
  companyName: APPLE_COMPANY_NAME,
  shares: 1,
  pricePerShare: 110,
  currency: 'USD',
  transactionDate: 'not-a-date',
  transactionType: 'BUY',
  createdAt: '2026-04-01T00:00:00.000Z',
};

const nullDateTransaction: PortfolioTransaction = {
  id: 'buy-3',
  ticker: APPLE_TICKER,
  companyName: APPLE_COMPANY_NAME,
  shares: 1,
  pricePerShare: 120,
  currency: 'USD',
  transactionDate: null,
  transactionType: 'BUY',
  createdAt: '2026-05-01T00:00:00.000Z',
};

function mockPortfolioRefreshApis() {
  jest.mocked(fetchPortfolioPositions).mockResolvedValue([]);
  jest.mocked(fetchPortfolioPositionsPage).mockResolvedValue({
    ...EMPTY_PAGE,
    limit: HOLDINGS_PAGE_SIZE,
  });
  jest.mocked(fetchPortfolioTransactionsPage).mockResolvedValue({
    ...EMPTY_PAGE,
    limit: TRANSACTIONS_PAGE_SIZE,
  });
  jest.mocked(fetchInvestmentSummary).mockResolvedValue({ totalInvested: 0, totalWithdrawn: 0 });
  jest.mocked(fetchPortfolioEquityHistory).mockResolvedValue([]);
  jest.mocked(fetchPortfolioNews).mockResolvedValue([]);
  jest.mocked(fetchPortfolioRebalancing).mockResolvedValue({
    strategyId: 'custom',
    strategyName: 'Custom',
    strategyDescription: 'Custom mix',
    strategyPhilosophy: 'Stay invested',
    investmentHorizon: 'Long term',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    displayCurrency: 'USD',
    alignmentScore: 80,
    totalPortfolioValue: 0,
    currentAllocations: [],
    targetAllocations: [],
    deviations: [],
    tickerMappings: [],
  });
  jest.mocked(fetchStockQuotesBatch).mockResolvedValue([]);
  jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
  jest.mocked(deletePortfolioPosition).mockResolvedValue(undefined);
  jest.mocked(deleteBuyTransaction).mockResolvedValue(undefined);
}

function renderPanel(
  portfolio: Record<string, unknown> = {},
  options?: { currency?: 'USD' | 'EUR' }
) {
  return renderWithProviders(<PositionsPanel />, {
    preloadedState: {
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
        hasHydratedNews: false,
        equityHistory: [],
        isLoadingEquityHistory: false,
        hasHydratedSummary: true,
        hasHydratedEquityHistory: false,
        portfolioHealth: {
          alignmentScore: null,
          strategyId: null,
          strategyName: null,
          deviations: [],
          isLoading: false,
          hasHydrated: false,
          error: null,
        },
        isLoading: false,
        error: null,
        ...portfolio,
      } as never,
      ui: { currency: options?.currency ?? 'USD', theme: 'dark' } as never,
    },
  });
}

describe('PositionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPortfolioRefreshApis();
  });

  it('shows the holdings loading state', () => {
    renderPanel({ isLoading: true, summaryPositions: [], positions: [] });

    expect(screen.getByRole('status')).toHaveAccessibleName(LOADING_MESSAGES.PORTFOLIO_HOLDINGS);
  });

  it('retries portfolio fetches from the error panel', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: ERROR_MESSAGES.PORTFOLIO_LOAD_FAILED,
      summaryPositions: [],
      positions: [],
    });

    expect(screen.getByText('Unable to load portfolio')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(fetchPortfolioPositions).toHaveBeenCalled();
    expect(fetchInvestmentSummary).toHaveBeenCalled();
    expect(fetchPortfolioPositionsPage).toHaveBeenCalled();
    expect(fetchPortfolioTransactionsPage).toHaveBeenCalled();
    expect(fetchPortfolioEquityHistory).toHaveBeenCalled();
  });

  it('opens the add-position modal from the empty state', async () => {
    const user = userEvent.setup();
    renderPanel({ isLoading: false, error: null, summaryPositions: [], positions: [] });

    expect(screen.getByRole('heading', { name: 'No positions yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import or connect a broker' })).toHaveAttribute(
      'href',
      '/portfolio?section=importer'
    );
    await user.click(screen.getByRole('button', { name: 'Add Position' }));

    expect(screen.getByRole('dialog', { name: 'Add position' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close add modal' }));
    expect(screen.queryByRole('dialog', { name: 'Add position' })).not.toBeInTheDocument();
  });

  it('renders stats, multi-sector allocation, holdings, and history', () => {
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition, microsoftPosition, energyPosition],
      positions: [applePosition, microsoftPosition, energyPosition],
      investmentSummary: { totalInvested: 2500, totalWithdrawn: 400 },
      equityHistory: [{ time: '2026-01-01', value: 2400 }],
      transactions: [buyTransaction, sellTransaction, invalidDateTransaction, nullDateTransaction],
      isLoadingTransactions: false,
      positionsHasMore: false,
      transactionsHasMore: false,
    });

    expect(screen.getByText('TOTAL INVESTED')).toBeInTheDocument();
    expect(screen.getByText('TOTAL RETURN')).toBeInTheDocument();
    expect(screen.getByText('SECTOR ALLOCATION')).toBeInTheDocument();
    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: new RegExp(APPLE_TICKER) })).toHaveAttribute(
      'href',
      buildTickerDetailPath(APPLE_TICKER)
    );
    expect(screen.getAllByText('BUY').length).toBeGreaterThan(0);
    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('renders a full-ring allocation chart for a single sector', () => {
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    expect(screen.getByText('SECTOR ALLOCATION')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('switches equity periods, sorts holdings, and filters the table', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition, microsoftPosition],
      positions: [applePosition, microsoftPosition],
      investmentSummary: { totalInvested: 2000, totalWithdrawn: 0 },
      equityHistory: [
        { time: '2026-01-01', value: 2000 },
        { time: '2026-08-01', value: 2400 },
      ],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByRole('button', { name: EQUITY_PERIODS[0].label }));
    await user.click(screen.getByText('MARKET VALUE ↕'));
    await user.click(screen.getByText('P&L ↕'));
    await user.click(screen.getByText('% ↕'));
    await user.click(screen.getByText('% ↕'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, MICROSOFT_TICKER);
    expect(screen.getByText(MICROSOFT_COMPANY_NAME)).toBeInTheDocument();
    expect(screen.queryByText(APPLE_COMPANY_NAME)).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'NoSuchHolding');
    expect(screen.getByText('No matching holdings')).toBeInTheDocument();
  });

  it('opens add, close, and delete flows from a holding row', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByRole('button', { name: 'Add Position' }));
    expect(screen.getByRole('dialog', { name: 'Add position' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close add modal' }));

    await user.click(screen.getByTitle('Close Position (Sell)'));
    expect(screen.getByRole('dialog', { name: 'Close position' })).toHaveTextContent(APPLE_TICKER);
    await user.click(screen.getByRole('button', { name: 'Close sell modal' }));

    await user.click(screen.getByTitle('Delete position'));
    const deleteDialog = screen.getByRole('dialog', { name: 'Delete position' });
    expect(within(deleteDialog).getByText(APPLE_TICKER)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel delete' }));
  });

  it('deletes a position from the confirm dialog', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByTitle('Delete position'));
    await user.click(screen.getByRole('button', { name: 'Confirm delete all' }));
    await waitFor(() => {
      expect(deletePortfolioPosition).toHaveBeenCalledWith(applePosition.id);
    });
  });

  it('deletes a buy lot and can switch to sell instead', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByTitle('Delete position'));
    await user.click(screen.getByRole('button', { name: 'Delete buy' }));
    expect(deleteBuyTransaction).toHaveBeenCalledWith(BUY_TRANSACTION_ID);
  });

  it('switches from delete to sell', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByTitle('Delete position'));
    await user.click(screen.getByRole('button', { name: 'Sell instead' }));
    expect(screen.getByRole('dialog', { name: 'Close position' })).toBeInTheDocument();
  });

  it('closes the delete dialog without deleting', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    await user.click(screen.getByTitle('Delete position'));
    await user.click(screen.getByRole('button', { name: 'Cancel delete' }));
    expect(screen.queryByRole('dialog', { name: 'Delete position' })).not.toBeInTheDocument();
    expect(deletePortfolioPosition).not.toHaveBeenCalled();
  });

  it('loads more holdings and transactions', async () => {
    const user = userEvent.setup();
    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [buyTransaction],
      isLoadingTransactions: false,
      positionsHasMore: true,
      isLoadingMorePositions: false,
      transactionsHasMore: true,
      isLoadingMoreTransactions: false,
    });

    const loadMoreButtons = screen.getAllByRole('button', { name: 'Load more' });
    await user.click(loadMoreButtons[0]);
    await user.click(loadMoreButtons[1]);

    expect(fetchPortfolioPositionsPage).toHaveBeenCalled();
    expect(fetchPortfolioTransactionsPage).toHaveBeenCalled();
  });

  it('shows transaction history loading and empty states', () => {
    const { unmount } = renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 1000, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: true,
    });

    expect(screen.getByRole('status')).toHaveAccessibleName(
      LOADING_MESSAGES.PORTFOLIO_TRANSACTIONS
    );
    unmount();

    renderPanel({
      isLoading: false,
      error: null,
      summaryPositions: [applePosition],
      positions: [applePosition],
      investmentSummary: { totalInvested: 0, totalWithdrawn: 0 },
      equityHistory: [],
      transactions: [],
      isLoadingTransactions: false,
    });

    expect(screen.getByText('No buy or sell transactions yet.')).toBeInTheDocument();
  });
});
