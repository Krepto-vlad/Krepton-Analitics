const mockGet = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: (...args: unknown[]) => mockGet(...args),
    })),
  },
}));

import { clearPortfolioNewsCache, getPortfolioNews } from '../../../services/newsService.js';

const nowSeconds = Math.floor(Date.now() / 1000);

function article(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'n-1',
    title: 'Apple beats estimates',
    publisher: 'Reuters',
    link: 'https://example.com/aapl',
    providerPublishTime: nowSeconds - 120,
    relatedTickers: ['AAPL'],
    ...overrides,
  };
}

describe('newsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPortfolioNewsCache();
  });

  it('returns an empty list when no tickers are provided', async () => {
    await expect(getPortfolioNews([])).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('maps Yahoo articles onto portfolio tickers', async () => {
    mockGet.mockResolvedValue({
      data: {
        news: [
          article(),
          { uuid: 'bad' },
          article({
            uuid: 'n-2',
            title: 'Hours old',
            providerPublishTime: nowSeconds - 2 * 3600,
            relatedTickers: [],
          }),
          article({
            uuid: 'n-3',
            title: 'Days old',
            publisher: '  ',
            providerPublishTime: nowSeconds - 2 * 24 * 3600,
          }),
        ],
      },
    });

    const items = await getPortfolioNews(['aapl']);

    expect(items[0]).toEqual(
      expect.objectContaining({
        id: 'n-1',
        tickers: ['AAPL'],
        source: 'Reuters',
        timeAgo: '2 min ago',
      })
    );
    expect(items.find((item) => item.id === 'n-2')?.timeAgo).toBe('2 hr ago');
    expect(items.find((item) => item.id === 'n-3')?.source).toBe('Yahoo Finance');
    expect(items.find((item) => item.id === 'n-3')?.timeAgo).toContain('day');
  });

  it('serves cached news on a repeat request', async () => {
    mockGet.mockResolvedValue({ data: { news: [article()] } });

    const first = await getPortfolioNews(['AAPL']);
    const second = await getPortfolioNews(['AAPL']);

    expect(second).toEqual(first);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('skips a ticker when Yahoo fails and still returns the rest', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ data: { news: [article({ relatedTickers: ['MSFT'] })] } });

    const items = await getPortfolioNews(['AAPL', 'MSFT']);

    expect(items).toEqual([expect.objectContaining({ tickers: ['MSFT'] })]);
  });
});
