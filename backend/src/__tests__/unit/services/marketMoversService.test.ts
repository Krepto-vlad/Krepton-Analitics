const mockScreener = jest.fn();

jest.mock('yahoo-finance2', () =>
  jest.fn().mockImplementation(() => ({
    screener: (...args: unknown[]) => mockScreener(...args),
  }))
);

import { MARKET_MOVERS_COUNT } from '../../../constants.js';
import { getMarketMovers } from '../../../services/marketMoversService.js';

function quote(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'AAPL',
    longName: 'Apple Inc.',
    regularMarketPrice: 150,
    regularMarketChange: 2,
    regularMarketChangePercent: 1.5,
    regularMarketVolume: 1000,
    marketCap: 2_000_000,
    currency: 'USD',
    ...overrides,
  };
}

describe('marketMoversService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps Yahoo screener quotes into gainers and losers', async () => {
    mockScreener
      .mockResolvedValueOnce({ quotes: [quote(), { symbol: 'SKIP' }] })
      .mockResolvedValueOnce({
        quotes: [quote({ symbol: 'TSLA', longName: 'Tesla', regularMarketChangePercent: -3 })],
      });

    const movers = await getMarketMovers();

    expect(mockScreener).toHaveBeenNthCalledWith(
      1,
      { scrIds: 'day_gainers', count: MARKET_MOVERS_COUNT },
      undefined,
      { validateResult: false }
    );
    expect(movers.gainers[0]).toEqual(
      expect.objectContaining({ ticker: 'AAPL', name: 'Apple Inc.', price: 150 })
    );
    expect(movers.losers[0].ticker).toBe('TSLA');
    expect(movers.fetchedAt).toEqual(expect.any(String));
  });

  it('returns the cached payload on a second call', async () => {
    const first = await getMarketMovers();
    const second = await getMarketMovers();

    expect(second).toBe(first);
    expect(mockScreener).not.toHaveBeenCalled();
  });

  it('throws 502 when both screeners are empty', async () => {
    jest.resetModules();
    mockScreener.mockReset();
    mockScreener.mockResolvedValue({ quotes: [] });
    const { getMarketMovers: getMoversFresh } =
      await import('../../../services/marketMoversService.js');

    await expect(getMoversFresh()).rejects.toMatchObject({ statusCode: 502 });
  });
});
