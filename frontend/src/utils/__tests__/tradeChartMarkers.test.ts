import type { PortfolioTransaction } from '../../api/portfolioApi';
import type { OhlcvCandle } from '../../types/stock.types';
import { buildTradeChartMarkers } from '../tradeChartMarkers';

const mondayCandle: OhlcvCandle = {
  time: Math.floor(Date.UTC(2026, 8, 7) / 1000),
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  volume: 100,
};

function makeTrade(overrides: Partial<PortfolioTransaction>): PortfolioTransaction {
  return {
    id: 'tx-1',
    ticker: 'AAPL',
    companyName: 'Apple',
    shares: 1,
    pricePerShare: 10,
    currency: 'USD',
    transactionDate: '2026-09-07',
    transactionType: 'BUY',
    createdAt: '2026-09-07T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildTradeChartMarkers', () => {
  it('skips trades without a usable date', () => {
    expect(
      buildTradeChartMarkers([makeTrade({ transactionDate: null, createdAt: '' })], [mondayCandle])
    ).toEqual([]);
  });

  it('pins a buy and a sell onto the nearest candle', () => {
    const markers = buildTradeChartMarkers(
      [
        makeTrade({ id: 'buy', transactionType: 'BUY' }),
        makeTrade({ id: 'sell', transactionType: 'SELL', transactionDate: null }),
      ],
      [mondayCandle]
    );

    expect(markers).toHaveLength(2);
    expect(markers[0]?.id).toBe('buy');
    expect(markers[0]?.price).toBe(11);
    expect(markers[1]?.id).toBe('sell');
  });

  it('ignores trades farther than the weekend snap window', () => {
    expect(
      buildTradeChartMarkers([makeTrade({ transactionDate: '2026-01-01' })], [mondayCandle])
    ).toEqual([]);
  });
});
