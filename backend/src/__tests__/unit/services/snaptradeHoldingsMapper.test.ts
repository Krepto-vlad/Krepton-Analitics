import {
  mapSnaptradePositionsToTrades,
  normalizeSnaptradeTicker,
} from '../../../services/snaptradeHoldingsMapper.js';

describe('snaptradeHoldingsMapper', () => {
  it('normalizes Trading 212 style tickers and keeps Yahoo symbols', () => {
    expect(normalizeSnaptradeTicker('AAPL_US_EQ')).toBe('AAPL');
    expect(normalizeSnaptradeTicker('brk.b')).toBe('BRK.B');
    expect(normalizeSnaptradeTicker('this-is-way-too-long-ticker')).toBeNull();
  });

  it('maps equity holdings and skips options, crypto, zero qty, and GBP', () => {
    const mapped = mapSnaptradePositionsToTrades(
      [
        {
          symbol: {
            symbol: { symbol: 'AAPL', description: 'Apple Inc.', type: { code: 'cs' } },
            raw_symbol: 'AAPL',
          },
          units: 10,
          average_purchase_price: 150,
          currency: { code: 'USD' },
        },
        {
          instrument: { kind: 'etf', symbol: 'VWCE', description: 'Vanguard FTSE' },
          units: '2.5',
          average_purchase_price: '100',
          currency: 'EUR',
        },
        {
          option_symbol: { ticker: 'AAPL240119C00150000' },
          units: 1,
          average_purchase_price: 3,
          currency: { code: 'USD' },
        },
        {
          instrument: { kind: 'crypto', symbol: 'BTC' },
          units: 0.1,
          average_purchase_price: 60000,
          currency: { code: 'USD' },
        },
        {
          symbol: { symbol: 'HSBA' },
          units: 5,
          average_purchase_price: 6,
          currency: { code: 'GBP' },
        },
        {
          symbol: { symbol: 'EMPTY' },
          units: 0,
          average_purchase_price: 10,
          currency: { code: 'USD' },
        },
      ],
      '2026-09-13'
    );

    expect(mapped.trades).toEqual([
      expect.objectContaining({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        shares: 10,
        pricePerShare: 150,
        currency: 'USD',
        transactionDate: '2026-09-13',
        transactionType: 'BUY',
        sourceType: 'snaptrade',
      }),
      expect.objectContaining({
        ticker: 'VWCE',
        shares: 2.5,
        currency: 'EUR',
      }),
    ]);
    expect(mapped.skipped).toHaveLength(4);
    expect(mapped.skipped.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        'Options are not imported',
        'crypto positions are not imported',
        'Only USD and EUR holdings can be synced',
        'Quantity is missing or zero',
      ])
    );
  });
});
