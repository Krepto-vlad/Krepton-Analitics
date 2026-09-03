jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getPositionsByPortfolioId: jest.fn(),
}));

jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn(),
}));

jest.mock('../../../services/newsService.js', () => ({
  getPortfolioNews: jest.fn(),
}));

import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../../../repositories/portfolioRepository.js';
import { buildBriefingPromptContext } from '../../../services/briefingContextService.js';
import { getPortfolioNews } from '../../../services/newsService.js';
import { getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import type { PositionRow } from '../../../types/portfolio.types.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';

const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;
const mockedQuotes = getCachedStockQuotes as jest.MockedFunction<typeof getCachedStockQuotes>;
const mockedNews = getPortfolioNews as jest.MockedFunction<typeof getPortfolioNews>;

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

describe('briefingContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOrCreate.mockResolvedValue('pf-1');
    mockedGetPositions.mockResolvedValue([positionRow()]);
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('AAPL'), price: 150, changePercent: 2.5, currency: 'USD' },
      { ...buildEmptyStockQuote('SPY'), price: 500, changePercent: 0.4, currency: 'USD' },
    ]);
    mockedNews.mockResolvedValue([
      {
        id: 'n-1',
        tickers: ['AAPL'],
        source: 'Reuters',
        timeAgo: '1h',
        headline: 'Apple reports earnings',
        url: 'https://example.com/aapl',
        publishedAt: '2026-01-15T10:00:00.000Z',
      },
    ]);
  });

  it('builds holdings with P&L when portfolio context is requested', async () => {
    const context = await buildBriefingPromptContext('user-1', ['AAPL'], true);

    expect(context.includePortfolioContext).toBe(true);
    expect(context.holdings).toEqual([
      expect.objectContaining({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        price: 150,
        shares: 10,
        avgBuyPrice: 100,
        unrealizedPnlPercent: 50,
      }),
    ]);
    expect(context.headlineLines[0]).toContain('[AAPL] Apple reports earnings');
    expect(context.macroSnapshots.find((entry) => entry.ticker === 'SPY')?.price).toBe(500);
  });

  it('omits position sizes when portfolio context is off', async () => {
    const context = await buildBriefingPromptContext('user-1', ['AAPL'], false);

    expect(context.holdings[0].shares).toBeUndefined();
    expect(context.holdings[0].avgBuyPrice).toBeUndefined();
  });
});
