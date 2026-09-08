import type { PortfolioPosition } from '../../types/portfolio.types';
import { aggregateTickerHoldings } from '../tickerHoldings';

const aapl: PortfolioPosition = {
  id: '1',
  ticker: 'AAPL',
  companyName: 'Apple',
  shares: 2,
  avgBuyPrice: 100,
  currency: 'USD',
  sector: 'Technology',
  entryDate: '2026-01-01',
  currentPrice: 150,
  logoUrl: null,
};

describe('aggregateTickerHoldings', () => {
  it('returns null when the ticker is not held', () => {
    expect(aggregateTickerHoldings([aapl], 'MSFT')).toBeNull();
  });

  it('returns null when matching lots have no shares', () => {
    expect(aggregateTickerHoldings([{ ...aapl, shares: 0 }], 'AAPL')).toBeNull();
  });

  it('aggregates lots of the same ticker and computes P&L', () => {
    const secondLot: PortfolioPosition = { ...aapl, id: '2', shares: 2, avgBuyPrice: 50 };
    const holding = aggregateTickerHoldings([aapl, secondLot], 'AAPL');

    expect(holding).toEqual({
      shares: 4,
      avgBuyPrice: 75,
      currency: 'USD',
      totalValue: 600,
      pnlAmount: 300,
      pnlPercent: 100,
    });
  });
});
