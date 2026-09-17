import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import {
  DEFAULT_INTERVAL,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  ROUTES,
  STOCK_MARKET_SESSION_LABELS,
  STOCK_PERIODS,
  BEGINNER_TUTORIAL_ANCHORS,
  TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX,
  BEGINNER_TUTORIAL_CHAT_QUERY,
  BEGINNER_TUTORIAL_CHAT_OPEN_VALUE,
  buildTickerDetailPath,
} from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { fetchLiveFxRates } from '../../../api/fxApi';
import { fetchTickerTransactions } from '../../../api/portfolioApi';
import {
  fetchStockFundamentals,
  fetchStockHistory,
  fetchStockNews,
  fetchStockQuote,
  fetchStockQuotesBatch,
} from '../../../api/stockApi';
import {
  createWatchlistItem,
  deleteWatchlistItem,
  fetchWatchlistItems,
} from '../../../api/watchlistApi';
import type { PortfolioPosition } from '../../../types/portfolio.types';
import type { StockCompareItem, StockQuote } from '../../../types/stock.types';
import type { WatchlistItem } from '../../../types/watchlist.types';
import { TickerDetailPage } from '../TickerDetailPage';

jest.mock('../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn(),
}));

jest.mock('../../../api/portfolioApi', () => ({
  fetchTickerTransactions: jest.fn(),
  fetchPortfolioPositions: jest.fn(),
}));

jest.mock('../../../api/stockApi', () => ({
  fetchStockQuote: jest.fn(),
  fetchStockHistory: jest.fn(),
  fetchStockFundamentals: jest.fn(),
  fetchStockNews: jest.fn(),
  fetchStockQuotesBatch: jest.fn(),
}));

jest.mock('../../../api/watchlistApi', () => ({
  fetchWatchlistItems: jest.fn(),
  createWatchlistItem: jest.fn(),
  deleteWatchlistItem: jest.fn(),
}));

jest.mock('../components/TickerPriceChartPanel', () => ({
  TickerPriceChartPanel: ({ isLoading }: { isLoading: boolean }) => (
    <div>{isLoading ? 'Chart loading' : 'Price chart mock'}</div>
  ),
}));

jest.mock('../components/TickerChatDrawer', () => ({
  TickerChatDrawer: ({
    ticker,
    companyName,
    isOpen,
    onOpenChange,
    onWidthChange,
    onResizingChange,
  }: {
    ticker: string;
    companyName: string;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onWidthChange: (widthPx: number) => void;
    onResizingChange: (isResizing: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(true)}>
        Open chat mock
      </button>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close chat mock
      </button>
      <button type="button" onClick={() => onWidthChange(TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX)}>
        Resize chat mock
      </button>
      <button type="button" onClick={() => onResizingChange(true)}>
        Start chat resize
      </button>
      {isOpen ? (
        <p data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.tickerChat}>
          Chat open for {ticker} {companyName}
        </p>
      ) : null}
    </div>
  ),
}));

const APPLE_TICKER = 'AAPL';
const APPLE_COMPANY_NAME = 'Apple Inc.';
const WATCHLIST_ITEM_ID = 'watch-1';
const POSITION_ID = 'position-apple';

const appleQuote: StockQuote = {
  ticker: APPLE_TICKER,
  name: APPLE_COMPANY_NAME,
  price: 150,
  change: 2.5,
  changePercent: 1.7,
  volume: 1_000_000,
  marketCap: 2_000_000_000_000,
  currency: 'USD',
  fiftyTwoWeekHigh: 180,
  fiftyTwoWeekLow: 120,
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

const appleFundamentals: StockCompareItem = {
  ticker: APPLE_TICKER,
  name: APPLE_COMPANY_NAME,
  currency: 'USD',
  price: 150,
  sector: 'Technology',
  industry: 'Consumer Electronics',
  marketCap: 2_000_000_000_000,
  enterpriseValue: null,
  trailingEps: null,
  peRatio: 28,
  forwardPeRatio: 26,
  pegRatio: 2.1,
  psRatio: 8,
  priceToBook: 40,
  evToEbitda: null,
  roe: 1.4,
  roa: null,
  profitMargin: 0.25,
  operatingMargin: null,
  revenueGrowth: null,
  earningsGrowth: null,
  debtToEquity: 1.5,
  currentRatio: null,
  dividendYield: 0.005,
  payoutRatio: null,
  beta: 1.2,
};

const applePosition: PortfolioPosition = {
  id: POSITION_ID,
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

const appleWatchlistItem: WatchlistItem = {
  id: WATCHLIST_ITEM_ID,
  ticker: APPLE_TICKER,
  companyName: APPLE_COMPANY_NAME,
  price: 150,
  changePercent: 1.7,
  currency: 'USD',
  fiftyTwoWeekHigh: 180,
  fiftyTwoWeekLow: 120,
  logoUrl: null,
};

function renderTickerPage(
  ticker = APPLE_TICKER,
  extraState: Record<string, unknown> = {},
  route = buildTickerDetailPath(ticker)
) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.TICKER} element={<TickerDetailPage />} />
      <Route path={ROUTES.DASHBOARD} element={<p>Dashboard</p>} />
    </Routes>,
    {
      route,
      preloadedState: {
        portfolio: {
          summaryPositions: [],
          hasHydratedSummary: true,
          isLoading: false,
          ...(extraState.portfolio as object),
        } as never,
        watchlist: {
          items: [],
          hasHydrated: true,
          isSubmitting: false,
          isLoading: false,
          error: null,
          ...(extraState.watchlist as object),
        } as never,
      },
    }
  );
}

describe('TickerDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchStockQuote).mockResolvedValue(appleQuote);
    jest.mocked(fetchStockFundamentals).mockResolvedValue(appleFundamentals);
    jest.mocked(fetchStockHistory).mockResolvedValue({
      ticker: APPLE_TICKER,
      interval: DEFAULT_INTERVAL,
      candles: [{ time: 1, open: 1, high: 2, low: 1, close: 1.5, volume: 100 }],
    });
    jest.mocked(fetchStockNews).mockResolvedValue([]);
    jest.mocked(fetchTickerTransactions).mockResolvedValue([]);
    jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
    jest.mocked(fetchWatchlistItems).mockResolvedValue([]);
    jest.mocked(fetchStockQuotesBatch).mockResolvedValue([appleQuote]);
    jest.mocked(createWatchlistItem).mockResolvedValue({
      id: WATCHLIST_ITEM_ID,
      ticker: APPLE_TICKER,
      companyName: APPLE_COMPANY_NAME,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    jest.mocked(deleteWatchlistItem).mockResolvedValue(undefined);
  });

  it('shows an invalid-ticker banner', () => {
    renderTickerPage('!!!');

    expect(screen.getByText(ERROR_MESSAGES.STOCK_INVALID_TICKER)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/ })).toHaveAttribute(
      'href',
      ROUTES.DASHBOARD
    );
  });

  it('shows a quote load error', async () => {
    jest.mocked(fetchStockQuote).mockRejectedValue({});
    renderTickerPage();

    expect(await screen.findByText(ERROR_MESSAGES.STOCK_TICKER_LOAD_FAILED)).toBeInTheDocument();
  });

  it('renders quote, statistics, holdings, and chart controls', async () => {
    const user = userEvent.setup();
    renderTickerPage(APPLE_TICKER, {
      portfolio: { summaryPositions: [applePosition] },
    });

    expect(await screen.findByRole('heading', { name: APPLE_TICKER })).toBeInTheDocument();
    expect(screen.getByText(APPLE_COMPANY_NAME)).toBeInTheDocument();
    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consumer Electronics').length).toBeGreaterThan(0);
    expect(screen.getByText(STOCK_MARKET_SESSION_LABELS.REGULAR)).toBeInTheDocument();
    expect(screen.getByText('Your position')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View portfolio' })).toHaveAttribute(
      'href',
      `${ROUTES.PORTFOLIO}?section=positions`
    );
    expect(screen.getByText('Price chart mock')).toBeInTheDocument();
    expect(screen.getByText('Key statistics')).toBeInTheDocument();
    expect(screen.getByText('52-Week Range')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: STOCK_PERIODS[0].label }));
    expect(fetchStockHistory).toHaveBeenCalledWith(
      APPLE_TICKER,
      STOCK_PERIODS[0].value,
      DEFAULT_INTERVAL
    );
  });

  it('adds and removes the ticker from the watchlist', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTickerPage();
    expect(await screen.findByRole('heading', { name: APPLE_TICKER })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    await waitFor(() => {
      expect(createWatchlistItem).toHaveBeenCalledWith({
        ticker: APPLE_TICKER,
        companyName: APPLE_COMPANY_NAME,
      });
    });
    unmount();

    jest.mocked(fetchWatchlistItems).mockResolvedValue([
      {
        id: WATCHLIST_ITEM_ID,
        ticker: APPLE_TICKER,
        companyName: APPLE_COMPANY_NAME,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    renderTickerPage(APPLE_TICKER, {
      watchlist: { items: [appleWatchlistItem], hasHydrated: true },
    });
    expect(
      await screen.findByRole('button', { name: 'Remove from watchlist' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove from watchlist' }));
    await waitFor(() => {
      expect(deleteWatchlistItem).toHaveBeenCalledWith(WATCHLIST_ITEM_ID);
    });
  });

  it('shows a watchlist action error', async () => {
    const user = userEvent.setup();
    jest.mocked(createWatchlistItem).mockRejectedValue({});
    renderTickerPage();
    expect(await screen.findByRole('heading', { name: APPLE_TICKER })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to watchlist' }));
    expect(await screen.findByText(ERROR_MESSAGES.WATCHLIST_ADD_FAILED)).toBeInTheDocument();
  });

  it('wires the chat drawer open, close, and resize callbacks', async () => {
    const user = userEvent.setup();
    renderTickerPage();
    expect(await screen.findByRole('heading', { name: APPLE_TICKER })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open chat mock' }));
    expect(
      screen.getByText(`Chat open for ${APPLE_TICKER} ${APPLE_COMPANY_NAME}`)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resize chat mock' }));
    await user.click(screen.getByRole('button', { name: 'Start chat resize' }));
    await user.click(screen.getByRole('button', { name: 'Close chat mock' }));
    expect(
      screen.queryByText(`Chat open for ${APPLE_TICKER} ${APPLE_COMPANY_NAME}`)
    ).not.toBeInTheDocument();
  });

  it('opens ticker chat from the tutorial query', async () => {
    renderTickerPage(
      APPLE_TICKER,
      {},
      `${buildTickerDetailPath(APPLE_TICKER)}?${BEGINNER_TUTORIAL_CHAT_QUERY}=${BEGINNER_TUTORIAL_CHAT_OPEN_VALUE}`
    );

    expect(
      await screen.findByText(`Chat open for ${APPLE_TICKER} ${APPLE_COMPANY_NAME}`)
    ).toBeInTheDocument();
  });

  it('shows a quote skeleton while the quote is still loading', async () => {
    jest.mocked(fetchStockQuote).mockReturnValue(new Promise(() => undefined));
    jest.mocked(fetchStockFundamentals).mockResolvedValue(appleFundamentals);
    renderTickerPage();

    expect(await screen.findByLabelText(LOADING_MESSAGES.TICKER_QUOTE)).toBeInTheDocument();
  });

  it('shows unavailable fundamentals when metrics are missing', async () => {
    jest.mocked(fetchStockFundamentals).mockResolvedValue({
      ...appleFundamentals,
      sector: null,
      industry: null,
      marketCap: null,
      peRatio: null,
      forwardPeRatio: null,
      pegRatio: null,
      psRatio: null,
      priceToBook: null,
      roe: null,
      profitMargin: null,
      debtToEquity: null,
      dividendYield: null,
      beta: null,
    });
    jest.mocked(fetchStockQuote).mockResolvedValue({
      ...appleQuote,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    });
    renderTickerPage();

    expect(
      await screen.findByText('Fundamentals are unavailable for this ticker.')
    ).toBeInTheDocument();
  });

  it('retries ticker news from the news panel', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchStockNews).mockRejectedValueOnce({}).mockResolvedValue([]);
    renderTickerPage();

    expect(await screen.findByText(ERROR_MESSAGES.STOCK_TICKER_NEWS_FAILED)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fetchStockNews).toHaveBeenCalledTimes(2);
  });
});
