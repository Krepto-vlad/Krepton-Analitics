import {
  BACKTEST_ALLOCATION_TOLERANCE,
  BACKTEST_ALLOCATION_TOTAL_PERCENT,
} from '../../../constants';

export interface BacktestAllocationTicker {
  ticker: string;
  name: string;
  weightPercent: number;
}

export function distributeEqualWeights(count: number): number[] {
  if (count <= 0) {
    return [];
  }

  const baseWeight = Math.floor(BACKTEST_ALLOCATION_TOTAL_PERCENT / count);
  const remainder = BACKTEST_ALLOCATION_TOTAL_PERCENT - baseWeight * count;

  return Array.from({ length: count }, (_, index) => baseWeight + (index < remainder ? 1 : 0));
}

export function rebalanceEqualWeights(
  tickers: BacktestAllocationTicker[]
): BacktestAllocationTicker[] {
  const weights = distributeEqualWeights(tickers.length);
  return tickers.map((ticker, index) => ({
    ...ticker,
    weightPercent: weights[index] ?? BACKTEST_ALLOCATION_TOTAL_PERCENT,
  }));
}

export function normalizeAllocationWeights(
  tickers: BacktestAllocationTicker[]
): BacktestAllocationTicker[] {
  if (tickers.length === 0) {
    return [];
  }

  if (tickers.length === 1) {
    return [{ ...tickers[0], weightPercent: BACKTEST_ALLOCATION_TOTAL_PERCENT }];
  }

  const totalWeight = tickers.reduce((sum, ticker) => sum + ticker.weightPercent, 0);
  if (totalWeight <= 0) {
    return rebalanceEqualWeights(tickers);
  }

  const scaled = tickers.map((ticker) => ({
    ...ticker,
    weightPercent: (ticker.weightPercent / totalWeight) * BACKTEST_ALLOCATION_TOTAL_PERCENT,
  }));

  const rounded = scaled.map((ticker) => ({
    ...ticker,
    weightPercent: Math.round(ticker.weightPercent * 10) / 10,
  }));

  const roundedTotal = rounded.reduce((sum, ticker) => sum + ticker.weightPercent, 0);
  const delta = Math.round((BACKTEST_ALLOCATION_TOTAL_PERCENT - roundedTotal) * 10) / 10;

  if (Math.abs(delta) > 0 && rounded.length > 0) {
    rounded[0] = {
      ...rounded[0],
      weightPercent: Math.round((rounded[0].weightPercent + delta) * 10) / 10,
    };
  }

  return rounded;
}

export function getTotalAllocationWeight(tickers: BacktestAllocationTicker[]): number {
  return tickers.reduce((sum, ticker) => sum + ticker.weightPercent, 0);
}

export type AllocationValidationStatus = 'valid' | 'under' | 'over';

export function getAllocationValidationStatus(totalWeight: number): AllocationValidationStatus {
  if (Math.abs(totalWeight - BACKTEST_ALLOCATION_TOTAL_PERCENT) <= BACKTEST_ALLOCATION_TOLERANCE) {
    return 'valid';
  }

  return totalWeight < BACKTEST_ALLOCATION_TOTAL_PERCENT ? 'under' : 'over';
}

const ALLOCATION_WEIGHT_TENTHS = 10;

function toWeightTenths(weight: number): number {
  return Math.round(weight * ALLOCATION_WEIGHT_TENTHS);
}

function fromWeightTenths(tenths: number): number {
  return tenths / ALLOCATION_WEIGHT_TENTHS;
}

export function adjustAllocationWeight(
  tickers: BacktestAllocationTicker[],
  changedTicker: string,
  newWeight: number
): BacktestAllocationTicker[] {
  if (tickers.length === 0) {
    return [];
  }

  const changedIndex = tickers.findIndex((ticker) => ticker.ticker === changedTicker);
  if (changedIndex === -1) {
    return tickers;
  }

  const clampedWeight = Math.max(0, Math.min(BACKTEST_ALLOCATION_TOTAL_PERCENT, newWeight));
  const changedTenths = toWeightTenths(clampedWeight);
  const weightTenths = tickers.map((ticker, index) =>
    index === changedIndex ? changedTenths : toWeightTenths(ticker.weightPercent)
  );

  if (tickers.length === 1) {
    return [{ ...tickers[0], weightPercent: fromWeightTenths(changedTenths) }];
  }

  const targetTenths = BACKTEST_ALLOCATION_TOTAL_PERCENT * ALLOCATION_WEIGHT_TENTHS;
  const totalTenths = weightTenths.reduce((sum, tenths) => sum + tenths, 0);
  const overflowTenths = totalTenths - targetTenths;

  if (overflowTenths <= 0) {
    return tickers.map((ticker, index) => ({
      ...ticker,
      weightPercent: fromWeightTenths(weightTenths[index]),
    }));
  }

  const otherIndices = tickers.map((_, index) => index).filter((index) => index !== changedIndex);
  const baseReductionTenths = Math.floor(overflowTenths / otherIndices.length);
  let remainderTenths = overflowTenths - baseReductionTenths * otherIndices.length;

  const sortedOtherIndices = [...otherIndices].sort(
    (leftIndex, rightIndex) => weightTenths[rightIndex] - weightTenths[leftIndex]
  );

  const adjustedTenths = [...weightTenths];

  for (const index of sortedOtherIndices) {
    let reductionTenths = baseReductionTenths;
    if (remainderTenths > 0) {
      reductionTenths += 1;
      remainderTenths -= 1;
    }

    adjustedTenths[index] = Math.max(0, adjustedTenths[index] - reductionTenths);
  }

  const finalTotalTenths = adjustedTenths.reduce((sum, tenths) => sum + tenths, 0);
  if (finalTotalTenths > targetTenths) {
    let excessTenths = finalTotalTenths - targetTenths;

    for (const index of sortedOtherIndices) {
      if (excessTenths <= 0) {
        break;
      }

      const reducibleTenths = Math.min(excessTenths, adjustedTenths[index]);
      adjustedTenths[index] -= reducibleTenths;
      excessTenths -= reducibleTenths;
    }
  }

  return tickers.map((ticker, index) => ({
    ...ticker,
    weightPercent: fromWeightTenths(adjustedTenths[index]),
  }));
}

export function formatAllocationLabel(tickers: BacktestAllocationTicker[]): string {
  if (tickers.length === 0) {
    return '';
  }

  if (tickers.length === 1) {
    return `$${tickers[0].ticker}`;
  }

  return tickers
    .map((ticker) => `${ticker.weightPercent.toFixed(0)}% $${ticker.ticker}`)
    .join(' + ');
}

export function buildAllocationsFromPortfolioPositions(
  positions: Array<{
    ticker: string;
    companyName: string;
    shares: number;
    currentPrice: number;
  }>,
  maxTickers: number
): BacktestAllocationTicker[] {
  const limitedPositions = positions.slice(0, maxTickers);
  if (limitedPositions.length === 0) {
    return [];
  }

  const totalMarketValue = limitedPositions.reduce(
    (sum, position) => sum + position.shares * position.currentPrice,
    0
  );

  if (totalMarketValue <= 0) {
    return rebalanceEqualWeights(
      limitedPositions.map((position) => ({
        ticker: position.ticker.toUpperCase(),
        name: position.companyName,
        weightPercent: 0,
      }))
    );
  }

  const weighted = limitedPositions.map((position) => ({
    ticker: position.ticker.toUpperCase(),
    name: position.companyName,
    weightPercent: ((position.shares * position.currentPrice) / totalMarketValue) * 100,
  }));

  return normalizeAllocationWeights(weighted);
}
