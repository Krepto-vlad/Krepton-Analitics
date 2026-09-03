import type { Currency } from '../constants';
import type { PortfolioPosition } from '../types/portfolio.types';

export interface AggregatedTickerHolding {
  shares: number;
  avgBuyPrice: number;
  currency: Currency;
  totalValue: number;
  pnlAmount: number;
  pnlPercent: number;
}

export function aggregateTickerHoldings(
  positions: PortfolioPosition[],
  ticker: string
): AggregatedTickerHolding | null {
  const matchingPositions = positions.filter(
    (position) => position.ticker.trim().toUpperCase() === ticker
  );

  if (matchingPositions.length === 0) {
    return null;
  }

  const shares = matchingPositions.reduce((sum, position) => sum + position.shares, 0);
  if (shares <= 0) {
    return null;
  }

  const totalCost = matchingPositions.reduce(
    (sum, position) => sum + position.shares * position.avgBuyPrice,
    0
  );
  const totalValue = matchingPositions.reduce(
    (sum, position) => sum + position.shares * position.currentPrice,
    0
  );
  const avgBuyPrice = totalCost / shares;
  const pnlAmount = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (pnlAmount / totalCost) * 100 : 0;
  const currency = (matchingPositions[0]?.currency ?? 'USD') as Currency;

  return {
    shares,
    avgBuyPrice,
    currency,
    totalValue,
    pnlAmount,
    pnlPercent,
  };
}
