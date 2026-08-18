const mockQuote = jest.fn();

jest.mock('yahoo-finance2', () =>
  jest.fn().mockImplementation(() => ({
    quote: (...args: unknown[]) => mockQuote(...args),
  }))
);

import {
  clearQuoteCacheForTests,
  getCachedStockQuote,
  getCachedStockQuotes,
} from '../../../services/quoteCacheService.js';

function yahooRow(symbol: string, price: number, previousClose = 100): Record<string, unknown> {
  return {
    symbol,
    longName: `${symbol} Inc.`,
    regularMarketPrice: price,
    regularMarketPreviousClose: previousClose,
    regularMarketVolume: 1_000,
    currency: 'USD',
    companyLogoUrl: 'https://example.com/logo.png',
  };
}

describe('quoteCacheService', () => {
  beforeEach(() => {
    mockQuote.mockReset();
    clearQuoteCacheForTests();
  });

  it('returns an empty list without calling Yahoo', async () => {
    await expect(getCachedStockQuotes([])).resolves.toEqual([]);
    expect(mockQuote).not.toHaveBeenCalled();
  });

  it('fetches, maps, and caches a quote so the second call is a cache hit', async () => {
    mockQuote.mockResolvedValue(yahooRow('AAPL', 150, 100));

    const first = await getCachedStockQuote('aapl');
    const second = await getCachedStockQuote('AAPL');

    expect(mockQuote).toHaveBeenCalledTimes(1);
    expect(first).toEqual(
      expect.objectContaining({
        ticker: 'AAPL',
        name: 'AAPL Inc.',
        price: 150,
        change: 50,
        changePercent: 50,
        currency: 'USD',
        logoUrl: 'https://example.com/logo.png',
      })
    );
    expect(second).toEqual(first);
  });

  it('negative-caches a Yahoo miss so invalid tickers do not re-hit the provider', async () => {
    mockQuote.mockResolvedValue([]);

    const first = await getCachedStockQuote('ZZZZ');
    const second = await getCachedStockQuote('ZZZZ');

    expect(mockQuote).toHaveBeenCalledTimes(1);
    expect(first.price).toBe(0);
    expect(first.ticker).toBe('ZZZZ');
    expect(second.price).toBe(0);
  });

  it('serves an empty quote when Yahoo throws and there is no stale price', async () => {
    mockQuote.mockRejectedValue(new Error('yahoo down'));

    const quote = await getCachedStockQuote('MSFT');

    expect(quote.price).toBe(0);
    expect(quote.ticker).toBe('MSFT');
  });
});
