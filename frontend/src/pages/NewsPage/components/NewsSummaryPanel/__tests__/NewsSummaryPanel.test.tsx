import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AI_NEWS_BRIEFING_COST_BASIS_TOOLTIP,
  AI_NEWS_BRIEFING_SP500_LABEL,
  AI_NEWS_BRIEFING_SP500_TICKER,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
} from '../../../../../constants';
import { fetchNewsSummaryQuota, generateNewsSummary } from '../../../../../api/portfolioApi';
import { fetchStockQuote } from '../../../../../api/stockApi';
import type { NewsSummaryResponse } from '../../../../../types/ai.types';
import type { PortfolioPosition } from '../../../../../types/portfolio.types';
import { NewsSummaryPanel } from '../NewsSummaryPanel';

jest.mock('../../../../../api/portfolioApi', () => ({
  fetchNewsSummaryQuota: jest.fn(),
  generateNewsSummary: jest.fn(),
}));

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockQuote: jest.fn(),
}));

const APPLE_TICKER = 'AAPL';
const MICROSOFT_TICKER = 'MSFT';
const NVIDIA_TICKER = 'NVDA';
const AMAZON_TICKER = 'AMZN';
const GOOGLE_TICKER = 'GOOGL';
const META_TICKER = 'META';
const HOLDINGS_KEY = 'holdings-key-1';
const SUMMARY_DATE = '2026-09-08';

const applePosition: PortfolioPosition = {
  id: 'p-apple',
  ticker: APPLE_TICKER,
  companyName: 'Apple Inc.',
  shares: 10,
  avgBuyPrice: 100,
  entryDate: '2026-01-01',
  currentPrice: 150,
  currency: 'USD',
  sector: 'Technology',
  logoUrl: null,
};

function buildPosition(id: string, ticker: string, companyName: string): PortfolioPosition {
  return {
    ...applePosition,
    id,
    ticker,
    companyName,
  };
}

const quota = {
  used: 1,
  limit: 5,
  remaining: 4,
  resetsAt: '2026-09-09T00:00:00.000Z',
};

const exhaustedQuota = {
  used: 5,
  limit: 5,
  remaining: 0,
  resetsAt: 'not-a-date',
};

const summary: NewsSummaryResponse = {
  summaryDate: SUMMARY_DATE,
  tickers: [APPLE_TICKER],
  holdingInsights: [
    {
      ticker: APPLE_TICKER,
      companyName: 'Apple Inc.',
      price: 150,
      changePercent: 1.5,
      currency: 'USD',
      sentiment: 'bullish',
      summary: 'iPhone demand remains strong.',
      highlights: ['Services growth'],
      shares: 10,
      avgBuyPrice: 100,
      unrealizedPnlPercent: 50,
    },
    {
      ticker: MICROSOFT_TICKER,
      companyName: 'Microsoft Corp.',
      price: null,
      changePercent: null,
      currency: 'USD',
      sentiment: 'bearish',
      summary: 'Cloud growth slowed.',
      highlights: [],
    },
    {
      ticker: NVIDIA_TICKER,
      companyName: 'NVIDIA Corp.',
      price: 800,
      changePercent: 0,
      currency: 'USD',
      sentiment: 'neutral',
      summary: 'AI demand is steady.',
      highlights: [],
    },
  ],
  marketDrivers: [{ title: 'Rates', explanation: 'Treasury yields eased.' }],
  marketBenchmark: null,
  sources: [],
  disclaimer: 'Not financial advice.',
  fromCache: true,
  quota,
  groundingEnabled: true,
  includePortfolioContext: true,
};

describe('NewsSummaryPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    jest.mocked(fetchNewsSummaryQuota).mockResolvedValue(quota);
    jest.mocked(generateNewsSummary).mockResolvedValue(summary);
    jest.mocked(fetchStockQuote).mockResolvedValue({
      ticker: AI_NEWS_BRIEFING_SP500_TICKER,
      name: 'SPDR S&P 500',
      price: 500,
      change: 1,
      changePercent: 0.4,
      volume: 1,
      marketCap: 1,
      currency: 'USD',
      fiftyTwoWeekHigh: 1,
      fiftyTwoWeekLow: 1,
      logoUrl: null,
      marketState: 'REGULAR',
      exchange: 'ARCA',
      preMarketPrice: null,
      preMarketChange: null,
      preMarketChangePercent: null,
      postMarketPrice: null,
      postMarketChange: null,
      postMarketChangePercent: null,
    });
  });

  it('shows holdings loading and empty states', () => {
    const { unmount } = render(
      <NewsSummaryPanel holdings={[]} holdingsKey={HOLDINGS_KEY} isHoldingsLoading />
    );
    expect(screen.getByRole('status')).toHaveAccessibleName(LOADING_MESSAGES.PORTFOLIO_HOLDINGS);
    unmount();

    render(<NewsSummaryPanel holdings={[]} holdingsKey={HOLDINGS_KEY} />);
    expect(screen.getByRole('heading', { name: 'AI Daily Briefing' })).toBeInTheDocument();
    expect(screen.getByText(/Add portfolio holdings/)).toBeInTheDocument();
  });

  it('loads quota and generates a briefing with benchmark fallback', async () => {
    const user = userEvent.setup();
    render(<NewsSummaryPanel holdings={[applePosition]} holdingsKey={HOLDINGS_KEY} />);

    expect(await screen.findByText('4 of 5 left today')).toBeInTheDocument();
    expect(screen.getByText(AI_NEWS_BRIEFING_COST_BASIS_TOOLTIP)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Include my cost basis/ }));
    await user.click(screen.getByRole('button', { name: "Generate today's briefing" }));

    expect(await screen.findByText('iPhone demand remains strong.')).toBeInTheDocument();
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    expect(screen.getByText('Bearish')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText('Cached today')).toBeInTheDocument();
    expect(screen.getByText('Google Search grounding')).toBeInTheDocument();
    expect(screen.getByText(/10 shares @/)).toBeInTheDocument();
    expect(screen.getByText('Rates')).toBeInTheDocument();
    expect(screen.getByText('Not financial advice.')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchStockQuote).toHaveBeenCalledWith(AI_NEWS_BRIEFING_SP500_TICKER);
    });
    expect(await screen.findByText(AI_NEWS_BRIEFING_SP500_LABEL)).toBeInTheDocument();
    expect(generateNewsSummary).toHaveBeenCalledWith({
      tickers: [APPLE_TICKER],
      includePortfolioContext: true,
    });
  });

  it('toggles tickers up to the maximum and shows a generate error', async () => {
    const user = userEvent.setup();
    jest.mocked(generateNewsSummary).mockRejectedValueOnce({});
    jest.mocked(fetchNewsSummaryQuota).mockResolvedValue(quota);

    const holdings = [
      applePosition,
      buildPosition('p-msft', MICROSOFT_TICKER, 'Microsoft Corp.'),
      buildPosition('p-nvda', NVIDIA_TICKER, 'NVIDIA Corp.'),
      buildPosition('p-amzn', AMAZON_TICKER, 'Amazon.com Inc.'),
      buildPosition('p-googl', GOOGLE_TICKER, 'Alphabet Inc.'),
      buildPosition('p-meta', META_TICKER, 'Meta Platforms'),
    ];

    render(<NewsSummaryPanel holdings={holdings} holdingsKey={HOLDINGS_KEY} />);
    await screen.findByText('4 of 5 left today');

    expect(screen.getByRole('button', { name: `$${META_TICKER}` })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: `$${APPLE_TICKER}` }));
    expect(screen.getByRole('button', { name: `$${META_TICKER}` })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: `$${META_TICKER}` }));

    await user.click(screen.getByRole('button', { name: "Generate today's briefing" }));
    expect(await screen.findByText(ERROR_MESSAGES.AI_NEWS_SUMMARY_FAILED)).toBeInTheDocument();
  });

  it('shows a quota error and a daily-limit hint', async () => {
    jest.mocked(fetchNewsSummaryQuota).mockRejectedValueOnce({});
    const { unmount } = render(
      <NewsSummaryPanel holdings={[applePosition]} holdingsKey={HOLDINGS_KEY} />
    );
    expect(
      await screen.findByText(ERROR_MESSAGES.AI_NEWS_SUMMARY_QUOTA_FAILED)
    ).toBeInTheDocument();
    unmount();

    jest.mocked(fetchNewsSummaryQuota).mockResolvedValue(exhaustedQuota);
    render(<NewsSummaryPanel holdings={[applePosition]} holdingsKey={HOLDINGS_KEY} />);
    expect(await screen.findByText(/Daily limit reached/)).toBeInTheDocument();
    expect(screen.getByText(/midnight UTC/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Generate today's briefing" })).toBeDisabled();
  });

  it('uses a summary market benchmark when the price is already present', async () => {
    const user = userEvent.setup();
    jest.mocked(generateNewsSummary).mockResolvedValue({
      ...summary,
      includePortfolioContext: false,
      marketBenchmark: {
        ticker: AI_NEWS_BRIEFING_SP500_TICKER,
        label: AI_NEWS_BRIEFING_SP500_LABEL,
        price: 510,
        changePercent: -0.2,
      },
    });

    render(<NewsSummaryPanel holdings={[applePosition]} holdingsKey={HOLDINGS_KEY} />);
    await screen.findByText('4 of 5 left today');
    await user.click(screen.getByRole('button', { name: "Generate today's briefing" }));

    expect(await screen.findByText(AI_NEWS_BRIEFING_SP500_LABEL)).toBeInTheDocument();
    expect(fetchStockQuote).not.toHaveBeenCalled();
  });
});
