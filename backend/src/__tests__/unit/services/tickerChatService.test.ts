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
}));

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getPositionsByPortfolioId: jest.fn(),
}));

import { AI_TICKER_CHAT_DISCLAIMER, AI_TICKER_CHAT_MAX_MESSAGE_CHARS } from '../../../constants.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../../../repositories/portfolioRepository.js';
import {
  assertAiQuotaAvailable,
  getAiQuotaStatus,
  recordAiUsage,
} from '../../../services/aiQuotaService.js';
import { generateTickerChatReplyWithGemini } from '../../../services/geminiClient.js';
import { getCachedStockQuote } from '../../../services/quoteCacheService.js';
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
const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;

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
});
