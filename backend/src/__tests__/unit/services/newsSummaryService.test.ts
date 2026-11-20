jest.mock('../../../services/aiQuotaService.js', () => ({
  assertAiQuotaAvailable: jest.fn(),
  getAiQuotaStatus: jest.fn(),
  recordAiUsage: jest.fn(),
}));

jest.mock('../../../services/briefingContextService.js', () => ({
  buildBriefingPromptContext: jest.fn(),
}));

jest.mock('../../../services/geminiClient.js', () => ({
  generateBriefingWithGemini: jest.fn(),
}));

jest.mock('../../../repositories/aiRepository.js', () => ({
  findNewsSummaryCache: jest.fn(),
  saveNewsSummaryCache: jest.fn(),
}));

jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getPositionsByPortfolioId: jest.fn(),
}));

import { AI_NEWS_SUMMARY_DISCLAIMER } from '../../../constants.js';
import { findNewsSummaryCache, saveNewsSummaryCache } from '../../../repositories/aiRepository.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../../../repositories/portfolioRepository.js';
import {
  assertAiQuotaAvailable,
  getAiQuotaStatus,
  recordAiUsage,
} from '../../../services/aiQuotaService.js';
import { buildBriefingPromptContext } from '../../../services/briefingContextService.js';
import { generateBriefingWithGemini } from '../../../services/geminiClient.js';
import {
  generateUserNewsSummary,
  getNewsSummaryQuota,
} from '../../../services/newsSummaryService.js';
import type { BriefingPromptContext, NewsSummaryPayload } from '../../../types/ai.types.js';
import type { PositionRow } from '../../../types/portfolio.types.js';

const mockedQuota = getAiQuotaStatus as jest.MockedFunction<typeof getAiQuotaStatus>;
const mockedAssertQuota = assertAiQuotaAvailable as jest.MockedFunction<
  typeof assertAiQuotaAvailable
>;
const mockedRecord = recordAiUsage as jest.MockedFunction<typeof recordAiUsage>;
const mockedFindCache = findNewsSummaryCache as jest.MockedFunction<typeof findNewsSummaryCache>;
const mockedSaveCache = saveNewsSummaryCache as jest.MockedFunction<typeof saveNewsSummaryCache>;
const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;
const mockedBriefing = buildBriefingPromptContext as jest.MockedFunction<
  typeof buildBriefingPromptContext
>;
const mockedGemini = generateBriefingWithGemini as jest.MockedFunction<
  typeof generateBriefingWithGemini
>;

const quotaStatus = {
  used: 1,
  limit: 5,
  remaining: 4,
  resetsAt: '2026-01-02T00:00:00.000Z',
};

function positionRow(): PositionRow {
  return {
    id: 'pos-1',
    portfolio_id: 'pf-1',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    shares: '10',
    avg_buy_price: '100',
    currency: 'USD',
    sector: 'Technology',
    entry_date: '2026-01-15',
    created_at: new Date('2026-01-15T00:00:00.000Z'),
    updated_at: new Date('2026-01-15T00:00:00.000Z'),
  };
}

function briefingContext(): BriefingPromptContext {
  return {
    summaryDate: '2026-01-15',
    holdings: [
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        price: 150,
        changePercent: 1.2,
        currency: 'USD',
        shares: 10,
        avgBuyPrice: 100,
        unrealizedPnlPercent: 50,
      },
    ],
    macroSnapshots: [{ ticker: 'SPY', label: 'S&P 500', price: 500, changePercent: 0.4 }],
    headlineLines: ['- [AAPL] Apple reports earnings'],
    includePortfolioContext: true,
    groundingEnabled: false,
  };
}

const geminiPayload: NewsSummaryPayload = {
  holdingInsights: [
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      price: 150,
      changePercent: 1.2,
      currency: 'USD',
      sentiment: 'bullish',
      summary: 'Strong demand.',
      highlights: ['Services growth'],
    },
  ],
  marketDrivers: [{ title: 'Rates', explanation: 'Yields eased.' }],
};

describe('newsSummaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuota.mockResolvedValue(quotaStatus);
    mockedAssertQuota.mockResolvedValue(quotaStatus);
    mockedRecord.mockResolvedValue(undefined);
    mockedFindOrCreate.mockResolvedValue('pf-1');
    mockedGetPositions.mockResolvedValue([positionRow()]);
    mockedBriefing.mockResolvedValue(briefingContext());
    mockedSaveCache.mockResolvedValue(undefined);
  });

  it('returns quota for the news_summary feature', async () => {
    await expect(getNewsSummaryQuota('user-1')).resolves.toEqual(quotaStatus);
    expect(mockedQuota).toHaveBeenCalledWith('user-1', 'news_summary');
  });

  it('rejects a non-array ticker list', async () => {
    await expect(
      generateUserNewsSummary('user-1', { tickers: 'AAPL' as unknown as string[] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects generation when the portfolio has no holdings', async () => {
    mockedGetPositions.mockResolvedValue([]);

    await expect(generateUserNewsSummary('user-1', { tickers: ['AAPL'] })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rejects a ticker that is not in the portfolio', async () => {
    await expect(generateUserNewsSummary('user-1', { tickers: ['MSFT'] })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('returns a cached briefing without calling Gemini or spending quota', async () => {
    mockedFindCache.mockResolvedValue({
      id: 'cache-1',
      user_id: 'user-1',
      tickers_key: 'AAPL',
      summary_date: '2026-01-15',
      tickers: ['AAPL'],
      summary_payload: geminiPayload,
      created_at: new Date(),
    });

    const result = await generateUserNewsSummary('user-1', {
      tickers: ['aapl'],
      includePortfolioContext: true,
    });

    expect(result.fromCache).toBe(true);
    expect(result.disclaimer).toBe(AI_NEWS_SUMMARY_DISCLAIMER);
    expect(result.holdingInsights[0].shares).toBe(10);
    expect(result.marketBenchmark).toEqual({
      ticker: 'SPY',
      label: 'S&P 500',
      price: 500,
      changePercent: 0.4,
    });
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedAssertQuota).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('fills a fallback insight when the model omitted a ticker', async () => {
    mockedFindCache.mockResolvedValue({
      id: 'cache-1',
      user_id: 'user-1',
      tickers_key: 'AAPL',
      summary_date: '2026-01-15',
      tickers: ['AAPL'],
      summary_payload: { holdingInsights: [], marketDrivers: [] },
      created_at: new Date(),
    });

    const result = await generateUserNewsSummary('user-1', { tickers: ['AAPL'] });

    expect(result.holdingInsights[0]).toEqual(
      expect.objectContaining({
        ticker: 'AAPL',
        sentiment: 'neutral',
        summary: 'Limited news coverage for this ticker today.',
      })
    );
  });

  it('generates, caches, and records usage on a cache miss', async () => {
    mockedFindCache.mockResolvedValue(null);
    mockedGemini.mockResolvedValue({
      payload: geminiPayload,
      sources: [{ title: 'Reuters', url: 'https://example.com' }],
      groundingEnabled: false,
    });

    const result = await generateUserNewsSummary('user-1', { tickers: ['AAPL'] });

    expect(mockedGemini).toHaveBeenCalled();
    expect(mockedSaveCache).toHaveBeenCalled();
    expect(mockedRecord).toHaveBeenCalledWith('user-1', 'news_summary');
    expect(result.fromCache).toBe(false);
    expect(result.sources).toEqual([]);
  });

  it('does not spend daily quota when Gemini fails', async () => {
    mockedFindCache.mockResolvedValue(null);
    mockedGemini.mockRejectedValue({ statusCode: 503, message: 'AI service is unavailable.' });

    await expect(generateUserNewsSummary('user-1', { tickers: ['AAPL'] })).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(mockedRecord).not.toHaveBeenCalled();
    expect(mockedSaveCache).not.toHaveBeenCalled();
  });
});
