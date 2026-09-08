import {
  adjustAllocationWeight,
  buildAllocationsFromPortfolioPositions,
  distributeEqualWeights,
  formatAllocationLabel,
  getAllocationValidationStatus,
  getTotalAllocationWeight,
  normalizeAllocationWeights,
  rebalanceEqualWeights,
} from '../backtestAllocations';

const tickers = [
  { ticker: 'AAPL', name: 'Apple', weightPercent: 60 },
  { ticker: 'MSFT', name: 'Microsoft', weightPercent: 40 },
];

describe('backtestAllocations', () => {
  it('splits 100 percent across n tickers', () => {
    expect(distributeEqualWeights(0)).toEqual([]);
    expect(distributeEqualWeights(3).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });

  it('rebalances and normalizes weights, including a zero-total fallback', () => {
    expect(rebalanceEqualWeights(tickers).map((item) => item.weightPercent)).toEqual([50, 50]);
    expect(normalizeAllocationWeights([])).toEqual([]);
    expect(normalizeAllocationWeights([tickers[0]])).toEqual([
      { ...tickers[0], weightPercent: 100 },
    ]);
    expect(
      getTotalAllocationWeight(
        normalizeAllocationWeights([
          { ticker: 'A', name: 'A', weightPercent: 0 },
          { ticker: 'B', name: 'B', weightPercent: 0 },
        ])
      )
    ).toBe(100);
  });

  it('validates allocation totals', () => {
    expect(getAllocationValidationStatus(100)).toBe('valid');
    expect(getAllocationValidationStatus(80)).toBe('under');
    expect(getAllocationValidationStatus(120)).toBe('over');
  });

  it('adjusts one ticker and redistributes overflow', () => {
    expect(adjustAllocationWeight([], 'AAPL', 10)).toEqual([]);
    expect(adjustAllocationWeight(tickers, 'IBM', 10)).toEqual(tickers);
    expect(adjustAllocationWeight([tickers[0]], 'AAPL', 40)[0]?.weightPercent).toBe(40);

    const adjusted = adjustAllocationWeight(tickers, 'AAPL', 80);
    expect(adjusted.find((item) => item.ticker === 'AAPL')?.weightPercent).toBe(80);
    expect(getTotalAllocationWeight(adjusted)).toBeLessThanOrEqual(100);
  });

  it('formats labels and builds weights from portfolio positions', () => {
    expect(formatAllocationLabel([])).toBe('');
    expect(formatAllocationLabel([tickers[0]])).toBe('$AAPL');
    expect(formatAllocationLabel(tickers)).toContain('% $AAPL');

    expect(buildAllocationsFromPortfolioPositions([], 5)).toEqual([]);
    const equalFallback = buildAllocationsFromPortfolioPositions(
      [{ ticker: 'aapl', companyName: 'Apple', shares: 0, currentPrice: 10 }],
      5
    );
    expect(equalFallback[0]?.weightPercent).toBe(100);

    const weighted = buildAllocationsFromPortfolioPositions(
      [
        { ticker: 'aapl', companyName: 'Apple', shares: 1, currentPrice: 75 },
        { ticker: 'msft', companyName: 'Microsoft', shares: 1, currentPrice: 25 },
      ],
      5
    );
    expect(getTotalAllocationWeight(weighted)).toBe(100);
    expect(weighted[0]?.ticker).toBe('AAPL');
  });
});
