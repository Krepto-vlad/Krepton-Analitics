jest.mock('../../../services/aiQuotaService.js', () => ({
  assertAiQuotaAvailable: jest.fn(),
  getAiQuotaStatus: jest.fn(),
  recordAiUsage: jest.fn(),
}));

jest.mock('../../../services/geminiClient.js', () => ({
  generateTickerChatReplyWithGemini: jest.fn(),
}));

jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuote: jest.fn(),
  getCachedStockQuotes: jest.fn(),
}));

jest.mock('../../../services/stockService.js', () => ({
  getStockCompare: jest.fn(),
  getStockFundamentals: jest.fn(),
  getStockHistory: jest.fn(),
  searchStocks: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../repositories/userRepository.js', () => ({
  findUserById: jest.fn().mockResolvedValue({ ai_personal_data_enabled: true }),
}));

jest.mock('../../../services/marketMoversService.js', () => ({
  getMarketMovers: jest.fn(),
}));

jest.mock('../../../services/portfolioService.js', () => ({
  getUserPortfolioRebalancingAnalysis: jest.fn(),
  getUserPortfolioDividendCalendar: jest.fn(),
  getUserPortfolioNews: jest.fn(),
  getUserPositions: jest.fn(),
}));

jest.mock('../../../services/watchlistService.js', () => ({
  getUserWatchlist: jest.fn(),
}));

jest.mock('../../../services/backtestService.js', () => {
  const actual = jest.requireActual('../../../services/backtestService.js');
  return {
    ...actual,
    runStockBacktest: jest.fn(),
  };
});

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getPositionsByPortfolioId: jest.fn(),
}));

import { AI_TICKER_CHAT_DISCLAIMER, AI_TICKER_CHAT_MAX_MESSAGE_CHARS } from '../../../constants.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../../../repositories/portfolioRepository.js';
import { findUserById } from '../../../repositories/userRepository.js';
import {
  assertAiQuotaAvailable,
  getAiQuotaStatus,
  recordAiUsage,
} from '../../../services/aiQuotaService.js';
import { generateTickerChatReplyWithGemini } from '../../../services/geminiClient.js';
import { getCachedStockQuote, getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import { getMarketMovers } from '../../../services/marketMoversService.js';
import {
  getUserPortfolioDividendCalendar,
  getUserPortfolioNews,
  getUserPortfolioRebalancingAnalysis,
  getUserPositions,
} from '../../../services/portfolioService.js';
import { getUserWatchlist } from '../../../services/watchlistService.js';
import {
  getStockCompare,
  getStockFundamentals,
  getStockHistory,
} from '../../../services/stockService.js';
import { runStockBacktest } from '../../../services/backtestService.js';
import { getTickerChatQuota, sendTickerChatMessage } from '../../../services/tickerChatService.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';
import type { PositionRow } from '../../../types/portfolio.types.js';

const mockedQuota = getAiQuotaStatus as jest.MockedFunction<typeof getAiQuotaStatus>;
const mockedAssertQuota = assertAiQuotaAvailable as jest.MockedFunction<
  typeof assertAiQuotaAvailable
>;
const mockedRecord = recordAiUsage as jest.MockedFunction<typeof recordAiUsage>;
const mockedGemini = generateTickerChatReplyWithGemini as jest.MockedFunction<
  typeof generateTickerChatReplyWithGemini
>;
const mockedQuote = getCachedStockQuote as jest.MockedFunction<typeof getCachedStockQuote>;
const mockedQuotes = getCachedStockQuotes as jest.MockedFunction<typeof getCachedStockQuotes>;
const mockedPositions = getUserPositions as jest.MockedFunction<typeof getUserPositions>;
const mockedNews = getUserPortfolioNews as jest.MockedFunction<typeof getUserPortfolioNews>;
const mockedWatchlist = getUserWatchlist as jest.MockedFunction<typeof getUserWatchlist>;
const mockedCompare = getStockCompare as jest.MockedFunction<typeof getStockCompare>;
const mockedFundamentals = getStockFundamentals as jest.MockedFunction<typeof getStockFundamentals>;
const mockedHistory = getStockHistory as jest.MockedFunction<typeof getStockHistory>;
const mockedDividends = getUserPortfolioDividendCalendar as jest.MockedFunction<
  typeof getUserPortfolioDividendCalendar
>;
const mockedMovers = getMarketMovers as jest.MockedFunction<typeof getMarketMovers>;
const mockedRebalancing = getUserPortfolioRebalancingAnalysis as jest.MockedFunction<
  typeof getUserPortfolioRebalancingAnalysis
>;
const mockedBacktest = runStockBacktest as jest.MockedFunction<typeof runStockBacktest>;
const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;
const mockedFindUser = findUserById as jest.MockedFunction<typeof findUserById>;

const quotaStatus = {
  used: 1,
  limit: 20,
  remaining: 19,
  resetsAt: '2026-01-02T00:00:00.000Z',
};

function holdingRow(): PositionRow {
  return {
    id: 'pos-1',
    portfolio_id: 'pf-1',
    ticker: 'TTWO',
    company_name: 'Take-Two',
    shares: '5',
    avg_buy_price: '100',
    currency: 'USD',
    sector: null,
    entry_date: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe('tickerChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuota.mockResolvedValue(quotaStatus);
    mockedAssertQuota.mockResolvedValue(quotaStatus);
    mockedRecord.mockResolvedValue(undefined);
    mockedFindOrCreate.mockResolvedValue('pf-1');
    mockedGetPositions.mockResolvedValue([]);
    mockedQuotes.mockResolvedValue([]);
  });

  it('returns quota for the ticker_chat feature', async () => {
    await expect(getTickerChatQuota('user-1')).resolves.toEqual(quotaStatus);
    expect(mockedQuota).toHaveBeenCalledWith('user-1', 'ticker_chat');
  });

  it('rejects a missing body', async () => {
    await expect(sendTickerChatMessage('user-1', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an invalid ticker', async () => {
    await expect(
      sendTickerChatMessage('user-1', { ticker: 'not a ticker!!!', message: 'risks?' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an empty message', async () => {
    await expect(
      sendTickerChatMessage('user-1', { ticker: 'TTWO', message: '   ' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('answers a page question without fetching a quote', async () => {
    mockedGemini.mockResolvedValue({
      reply: 'The page has no attached figures.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      message: 'What does this page show?',
    });

    expect(mockedQuote).not.toHaveBeenCalled();
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: '',
        screenContextText: null,
      })
    );
    expect(result.ticker).toBe('');
    expect(result.factCheck.livePrice).toBeNull();
    expect(result.reply).toBe('The page has no attached figures.');
    expect(result.chartTicker).toBeNull();
  });

  it('answers a named company from fresh quotes instead of the open page', async () => {
    mockedQuotes.mockResolvedValue([
      {
        ...buildEmptyStockQuote('MSFT'),
        name: 'Microsoft',
        price: 420,
        currency: 'USD',
        changePercent: 1.5,
      },
    ]);
    mockedGemini.mockResolvedValue({
      reply: 'Microsoft is trading at 420.00 today.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      message: 'как поживает макрософт сегодня?',
    });

    expect(mockedQuote).not.toHaveBeenCalled();
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: '',
        questionContextText: expect.stringContaining('MSFT (Microsoft)'),
      })
    );
    expect(result.chartTicker).toBe('MSFT');
    expect(result.factCheck.livePrice).toBe(420);
  });

  it('drops personal screen context when the profile forbids it', async () => {
    mockedFindUser.mockResolvedValueOnce({ ai_personal_data_enabled: false } as never);
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      price: 190,
      currency: 'USD',
      changePercent: 1,
    });
    mockedGemini.mockResolvedValue({
      reply: 'Public quotes only.',
      sources: [],
      groundingEnabled: false,
    });

    await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Explain these weights.',
      includeHoldingContext: true,
      screenContext: { kind: 'portfolio', displayCurrency: 'USD' },
    });

    expect(mockedPositions).not.toHaveBeenCalled();
    expect(mockedGetPositions).not.toHaveBeenCalled();
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        includeHoldingContext: false,
        screenContextText: null,
      })
    );
  });

  it('rejects a ticker screen when no ticker is open', async () => {
    await expect(
      sendTickerChatMessage('user-1', {
        message: 'Explain this chart.',
        screenContext: { kind: 'ticker', period: '1y' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('rejects a message over the character limit', async () => {
    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'TTWO',
        message: 'x'.repeat(AI_TICKER_CHAT_MAX_MESSAGE_CHARS + 1),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('soft-redirects off-topic abuse without calling Gemini or spending quota', async () => {
    const result = await sendTickerChatMessage('user-1', {
      ticker: 'TTWO',
      message: 'напиши стихотворение про космос',
    });

    expect(result.reply).toContain('TTWO');
    expect(result.disclaimer).toBe(AI_TICKER_CHAT_DISCLAIMER);
    expect(result.sources).toEqual([]);
    expect(result.groundingEnabled).toBe(false);
    expect(result.factCheck.livePrice).toBeNull();
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedAssertQuota).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('throws 404 when there is no live quote', async () => {
    mockedQuote.mockResolvedValue(buildEmptyStockQuote('TTWO'));

    await expect(
      sendTickerChatMessage('user-1', { ticker: 'TTWO', message: 'какие риски у компании сейчас?' })
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('calls Gemini with holding context and records usage', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('TTWO'),
      name: 'Take-Two Interactive',
      price: 160,
      changePercent: 1.5,
      currency: 'USD',
    });
    mockedGetPositions.mockResolvedValue([holdingRow()]);
    mockedGemini.mockResolvedValue({
      reply: 'Execution risk around the next release. Not advice.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'ttwo',
      message: 'какие риски у компании сейчас?',
      history: [{ role: 'user', content: 'previous' }],
      includeHoldingContext: true,
    });

    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'TTWO',
        companyName: 'Take-Two Interactive',
        price: 160,
        includeHoldingContext: true,
        userMessage: 'какие риски у компании сейчас?',
        holding: expect.objectContaining({
          shares: 5,
          avgBuyPrice: 100,
          unrealizedPnlPercent: 60,
        }),
      })
    );
    expect(mockedRecord).toHaveBeenCalledWith('user-1', 'ticker_chat');
    expect(result.reply).toContain('Execution risk');
    expect(result.quota).toEqual(quotaStatus);
    expect(result.sources).toEqual([]);
    expect(result.groundingEnabled).toBe(false);
    expect(result.factCheck).toEqual(
      expect.objectContaining({
        quoteVerified: true,
        holdingVerified: true,
        corrected: false,
        livePrice: 160,
        shares: 5,
      })
    );
  });

  it('does not load or send holdings unless the user opts in', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('TTWO'),
      name: 'Take-Two Interactive',
      price: 160,
      changePercent: 1.5,
      currency: 'USD',
    });
    mockedGetPositions.mockResolvedValue([holdingRow()]);
    mockedGemini.mockResolvedValue({
      reply: 'Launch risk around GTA VI. Not advice.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'TTWO',
      message: 'какие риски у компании сейчас?',
    });

    expect(mockedGetPositions).not.toHaveBeenCalled();
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        includeHoldingContext: false,
        holding: null,
      })
    );
    expect(result.factCheck.shares).toBeNull();
  });

  it('appends a fact-check when Gemini contradicts the live quote', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple Inc.',
      price: 190,
      changePercent: -1.2,
      currency: 'USD',
    });
    mockedGemini.mockResolvedValue({
      reply: 'AAPL is trading at $900 after a rumor.',
      sources: [{ title: 'Rumor', url: 'https://example.com/rumor' }],
      groundingEnabled: true,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'What moved the price?',
    });

    expect(result.groundingEnabled).toBe(true);
    expect(result.sources).toEqual([]);
    expect(result.factCheck.quoteVerified).toBe(false);
    expect(result.factCheck.corrected).toBe(true);
    expect(result.reply).toContain('Krepton fact-check:');
    expect(result.reply).toContain('USD 190.00');
  });

  it('does not return grounding URLs to the client', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple Inc.',
      price: 190,
      changePercent: -1.2,
      currency: 'USD',
    });
    mockedGemini.mockResolvedValue({
      reply: 'News broke. Read [this](https://evil.example/phish).',
      sources: [{ title: 'Phish', url: 'https://evil.example/phish' }],
      groundingEnabled: true,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'What moved the price?',
    });

    expect(result.sources).toEqual([]);
    expect(result.reply).toContain('News broke. Read this.');
    expect(result.reply).not.toContain('http');
  });

  it('does not spend daily quota when Gemini fails', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple Inc.',
      price: 190,
      changePercent: -1.2,
      currency: 'USD',
    });
    mockedGemini.mockRejectedValue({ statusCode: 503, message: 'AI service is unavailable.' });

    await expect(
      sendTickerChatMessage('user-1', { ticker: 'AAPL', message: 'What moved the price?' })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('does not spend daily quota when the delivered reply is empty', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple Inc.',
      price: 190,
      changePercent: -1.2,
      currency: 'USD',
    });
    mockedGemini.mockResolvedValue({
      reply: 'https://evil.example/only-a-link',
      sources: [],
      groundingEnabled: false,
    });

    await expect(
      sendTickerChatMessage('user-1', { ticker: 'AAPL', message: 'What moved the price?' })
    ).rejects.toMatchObject({ statusCode: 502 });
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('attaches a verified comparison and returns bar cards', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('MSFT'),
      name: 'Microsoft',
      price: 420,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedCompare.mockResolvedValue({
      tickers: ['MSFT', 'AAPL'],
      items: [
        {
          ticker: 'MSFT',
          name: 'Microsoft',
          currency: 'USD',
          price: 420,
          peRatio: 35,
          revenueGrowth: 15,
          profitMargin: 35,
        },
        {
          ticker: 'AAPL',
          name: 'Apple',
          currency: 'USD',
          price: 190,
          peRatio: 28,
          revenueGrowth: 8,
          profitMargin: 24,
        },
      ] as never,
    });
    mockedGemini.mockResolvedValue({
      reply: 'Microsoft and Apple differ on margin. Not a trade recommendation.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'MSFT',
      message: 'Explain the comparison on screen.',
      screenContext: { kind: 'compare', tickers: ['msft', 'AAPL'] },
    });

    expect(mockedCompare).toHaveBeenCalledWith(['MSFT', 'AAPL']);
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining('MSFT (Microsoft)'),
      })
    );
    expect(result.displayBlocks).toHaveLength(3);
    expect(result.factCheck.quoteVerified).toBe(true);
  });

  it('rejects a comparison screen with fewer than two tickers', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('MSFT'),
      name: 'Microsoft',
      price: 420,
      changePercent: 0.4,
      currency: 'USD',
    });

    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'MSFT',
        message: 'Explain the comparison on screen.',
        screenContext: { kind: 'compare', tickers: ['MSFT'] },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('loads the saved rebalancing mix for the signed-in user', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('VOO'),
      name: 'Vanguard S&P 500',
      price: 500,
      changePercent: 0.2,
      currency: 'USD',
    });
    mockedRebalancing.mockResolvedValue({
      strategyName: 'Buffett 90/10',
      alignmentScore: 80,
      displayCurrency: 'EUR',
      totalPortfolioValue: 1000,
      deviations: [
        {
          bucketId: 'equities',
          label: 'Equities',
          color: '#000',
          currentPercent: 70,
          targetPercent: 90,
          deviationPercent: -20,
          status: 'underweight',
        },
      ],
      targetAllocations: [],
      tickerMappings: [],
    } as never);
    mockedGemini.mockResolvedValue({
      reply: 'Equities are below the target mix. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'VOO',
      message: 'Explain this drift.',
      screenContext: { kind: 'rebalancing', displayCurrency: 'EUR' },
    });

    expect(mockedRebalancing).toHaveBeenCalledWith('user-1', 'EUR');
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining('Buffett 90/10'),
      })
    );
    expect(result.displayBlocks[0]).toEqual(expect.objectContaining({ kind: 'allocation-bars' }));
  });

  it('loads day movers instead of trusting client prices', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('NVDA'),
      name: 'NVIDIA',
      price: 120,
      changePercent: 8,
      currency: 'USD',
    });
    mockedMovers.mockResolvedValue({
      gainers: [
        {
          ticker: 'NVDA',
          name: 'NVIDIA',
          price: 120,
          change: 9,
          changePercent: 8.2,
          volume: 1,
          marketCap: null,
          currency: 'USD',
        },
      ],
      losers: [],
      fetchedAt: '2026-10-20T12:00:00.000Z',
    });
    mockedGemini.mockResolvedValue({
      reply: 'NVIDIA led the gainers. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'NVDA',
      message: 'Explain today movers.',
      screenContext: { kind: 'movers' },
    });

    expect(mockedMovers).toHaveBeenCalled();
    expect(result.displayBlocks[0]).toEqual(expect.objectContaining({ side: 'gainers' }));
    expect(result.factCheck.quoteVerified).toBe(true);
  });

  it('recalculates a backtest from the saved allocations', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedBacktest.mockResolvedValue({
      amount: 1000,
      displayCurrency: 'USD',
      period: '3y',
      periodLabel: '3 Years',
      portfolio: { returnPercent: 42, finalValue: 1420, currency: 'USD' },
      holdings: [
        {
          ticker: 'AAPL',
          name: 'Apple',
          currency: 'USD',
          weightPercent: 100,
          allocatedAmount: 1000,
          returnPercent: 42,
          contributionValue: 420,
        },
      ],
      benchmark: {
        label: 'S&P 500',
        ticker: 'SPY',
        returnPercent: 30,
        finalValue: 1300,
        currency: 'USD',
      },
      periodBreakdown: [],
    });
    mockedGemini.mockResolvedValue({
      reply: 'The backtest beat its benchmark. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Explain this backtest.',
      screenContext: {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [{ ticker: 'aapl', weightPercent: 100 }],
      },
    });

    expect(mockedBacktest).toHaveBeenCalledWith({
      allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
    });
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'backtest-bars',
        rows: expect.arrayContaining([{ label: 'AAPL', returnPercent: 42 }]),
      })
    );
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining('AAPL (Apple)'),
      })
    );
  });

  it('rejects a backtest whose weights do not sum to 100', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });

    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'AAPL',
        message: 'Explain this backtest.',
        screenContext: {
          kind: 'backtest',
          period: '3y',
          amount: 1000,
          displayCurrency: 'USD',
          allocations: [
            { ticker: 'AAPL', weightPercent: 60 },
            { ticker: 'MSFT', weightPercent: 30 },
          ],
        },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedBacktest).not.toHaveBeenCalled();
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it.each([
    ['an unknown screen', { kind: 'billing' }],
    ['a screen that is not an object', ['backtest']],
    [
      'an invalid period',
      {
        kind: 'backtest',
        period: '2y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
      },
    ],
    [
      'an amount outside the allowed range',
      {
        kind: 'backtest',
        period: '3y',
        amount: 0,
        displayCurrency: 'USD',
        allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
      },
    ],
    [
      'allocations that are not a list',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: 'AAPL',
      },
    ],
    [
      'too many tickers',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'].map((ticker) => ({
          ticker,
          weightPercent: 20,
        })),
      },
    ],
    [
      'an allocation that is not an object',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [null],
      },
    ],
    [
      'a ticker that is not text',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [{ ticker: 12, weightPercent: 100 }],
      },
    ],
    [
      'a weight that is not positive',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [{ ticker: 'AAPL', weightPercent: 0 }],
      },
    ],
    [
      'a ticker symbol Krepton cannot use',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [{ ticker: '!!!', weightPercent: 100 }],
      },
    ],
    [
      'the same ticker twice',
      {
        kind: 'backtest',
        period: '3y',
        amount: 1000,
        displayCurrency: 'USD',
        allocations: [
          { ticker: 'AAPL', weightPercent: 50 },
          { ticker: 'aapl', weightPercent: 50 },
        ],
      },
    ],
  ])('rejects a backtest screen with %s', async (_label, screenContext) => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });

    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'AAPL',
        message: 'Explain this backtest.',
        screenContext,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedBacktest).not.toHaveBeenCalled();
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('reloads the dividend calendar for the signed-in portfolio', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedDividends.mockResolvedValue({
      displayCurrency: 'EUR',
      chartYear: 2026,
      summary: { annualIncome: 120, avgMonthlyIncome: 10, remainingYearIncome: 40 },
      monthlyPayouts: [
        {
          month: 1,
          year: 2026,
          label: 'Jan',
          dividendTotal: 10,
          couponTotal: 0,
          total: 10,
          isProjected: false,
        },
      ],
      upcomingPayments: [
        {
          ticker: 'AAPL',
          companyName: 'Apple',
          paymentType: 'dividend',
          amountPerShare: 0.25,
          totalAmount: 10,
          currency: 'EUR',
          paymentDate: '2026-01-15',
          isProjected: false,
        },
      ],
    });
    mockedGemini.mockResolvedValue({
      reply: 'January has a scheduled payout. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Explain this calendar.',
      screenContext: { kind: 'dividends', displayCurrency: 'EUR' },
    });

    expect(mockedDividends).toHaveBeenCalledWith('user-1', 'EUR');
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'payout-bars',
        currency: 'EUR',
        rows: [{ label: 'Jan', amount: 10 }],
      })
    );
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining('EUR 120.00'),
      })
    );
  });

  it('reloads the chart period and fundamentals for the chat ticker', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedFundamentals.mockResolvedValue({
      ticker: 'AAPL',
      name: 'Apple',
      currency: 'USD',
      price: 190,
      peRatio: 28,
      revenueGrowth: 8,
      profitMargin: 24,
    } as never);
    mockedHistory.mockResolvedValue({
      ticker: 'AAPL',
      interval: '1d',
      candles: [
        { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 1 },
        { time: 2, open: 120, high: 120, low: 120, close: 120, volume: 1 },
      ],
    });
    mockedGemini.mockResolvedValue({
      reply: 'The year is up. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'aapl',
      message: 'Explain this chart.',
      screenContext: { kind: 'ticker', period: '1y' },
    });

    expect(mockedHistory).toHaveBeenCalledWith('AAPL', '1y', '1d');
    expect(mockedFundamentals).toHaveBeenCalledWith('AAPL');
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'backtest-bars',
        title: '1Y',
        rows: [{ label: 'AAPL', returnPercent: 20 }],
      })
    );
    expect(result.factCheck.quoteVerified).toBe(true);
  });

  it('rejects a chart period the ticker page does not show', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });

    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'AAPL',
        message: 'Explain this chart.',
        screenContext: { kind: 'ticker', period: '10y' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedHistory).not.toHaveBeenCalled();
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('rebuilds portfolio weights from live quotes without share counts', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedPositions.mockResolvedValue([
      {
        ticker: 'AAPL',
        companyName: 'Apple',
        shares: 10,
        sector: 'Technology',
        currency: 'USD',
      },
      {
        ticker: 'MSFT',
        companyName: 'Microsoft',
        shares: 10,
        sector: 'Technology',
        currency: 'USD',
      },
    ] as never);
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('AAPL'), price: 100, currency: 'USD', changePercent: 1 },
      { ...buildEmptyStockQuote('MSFT'), price: 100, currency: 'USD', changePercent: -1 },
    ]);
    mockedGemini.mockResolvedValue({
      reply: 'The weights are even. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Explain these weights.',
      screenContext: { kind: 'portfolio', displayCurrency: 'USD' },
    });

    expect(mockedPositions).toHaveBeenCalledWith('user-1', 'USD');
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'weight-bars',
        rows: [
          { label: 'AAPL', weightPercent: 50 },
          { label: 'MSFT', weightPercent: 50 },
        ],
      })
    );
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining(
          'Share counts and average buy prices are not included.'
        ),
      })
    );
  });

  it('reloads portfolio headlines and leaves the article links out', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedNews.mockResolvedValue([
      {
        id: 'n-1',
        tickers: ['AAPL'],
        source: 'Example News',
        timeAgo: '1 hr ago',
        headline: 'Apple updates a product line',
        url: 'https://example.com/apple',
        publishedAt: '2026-10-20T12:00:00.000Z',
      },
    ]);
    mockedGemini.mockResolvedValue({
      reply: 'The headline is about a product line. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Explain these headlines.',
      screenContext: { kind: 'news' },
    });

    expect(mockedNews).toHaveBeenCalledWith('user-1');
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'headline-list',
        rows: [{ ticker: 'AAPL', headline: 'Apple updates a product line' }],
      })
    );
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.not.stringContaining('https://'),
      })
    );
  });

  it('reloads watchlist quotes instead of trusting the page prices', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('MSFT'),
      name: 'Microsoft',
      price: 400,
      changePercent: 1,
      currency: 'USD',
    });
    mockedWatchlist.mockResolvedValue([
      {
        id: 'w-1',
        ticker: 'MSFT',
        companyName: 'Microsoft',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockedQuotes.mockResolvedValue([
      {
        ...buildEmptyStockQuote('MSFT'),
        name: 'Microsoft',
        price: 410,
        changePercent: 2.5,
        currency: 'USD',
      },
    ]);
    mockedGemini.mockResolvedValue({
      reply: 'Microsoft is up on the day. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'MSFT',
      message: 'Explain this watchlist.',
      screenContext: { kind: 'watchlist' },
    });

    expect(mockedWatchlist).toHaveBeenCalledWith('user-1');
    expect(mockedQuotes).toHaveBeenCalledWith(['MSFT']);
    expect(result.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'backtest-bars',
        title: 'Day change',
        rows: [{ label: 'MSFT', returnPercent: 2.5 }],
      })
    );
    expect(result.factCheck.quoteVerified).toBe(true);
  });

  it('compares the open ticker with the previous one from Krepton history', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });
    mockedFundamentals.mockImplementation(
      async (symbol: string) =>
        ({
          ticker: symbol,
          name: symbol === 'MSFT' ? 'Microsoft' : 'Apple',
          currency: 'USD',
          price: symbol === 'MSFT' ? 410 : 190,
        }) as never
    );
    mockedHistory.mockImplementation(async (symbol: string) => ({
      ticker: symbol,
      interval: '1d',
      candles:
        symbol === 'MSFT'
          ? [
              { time: 1, open: 300, high: 320, low: 290, close: 300, volume: 1 },
              { time: 2, open: 330, high: 340, low: 310, close: 330, volume: 1 },
            ]
          : [
              { time: 1, open: 100, high: 110, low: 90, close: 100, volume: 1 },
              { time: 2, open: 120, high: 130, low: 95, close: 120, volume: 1 },
            ],
    }));
    mockedGemini.mockResolvedValue({
      reply: 'Both paths rose. Not a trade instruction.',
      sources: [],
      groundingEnabled: false,
    });

    const result = await sendTickerChatMessage('user-1', {
      ticker: 'AAPL',
      message: 'Describe the 1Y price paths.',
      screenContext: { kind: 'pair', otherTicker: 'MSFT', period: '1y', topic: 'paths' },
    });

    expect(mockedHistory).toHaveBeenCalledWith('AAPL', '1y', '1d');
    expect(mockedHistory).toHaveBeenCalledWith('MSFT', '1y', '1d');
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        screenContextText: expect.stringContaining('Wyckoff'),
      })
    );
    expect(result.displayBlocks[0]).toEqual({
      kind: 'backtest-bars',
      title: '1Y',
      rows: [
        { label: 'AAPL', returnPercent: 20 },
        { label: 'MSFT', returnPercent: 10 },
      ],
    });
  });

  it('rejects a pair that names the same ticker twice', async () => {
    mockedQuote.mockResolvedValue({
      ...buildEmptyStockQuote('AAPL'),
      name: 'Apple',
      price: 190,
      changePercent: 0.4,
      currency: 'USD',
    });

    await expect(
      sendTickerChatMessage('user-1', {
        ticker: 'AAPL',
        message: 'Compare the metrics.',
        screenContext: { kind: 'pair', otherTicker: 'AAPL', period: '1y', topic: 'metrics' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedCompare).not.toHaveBeenCalled();
  });
});
