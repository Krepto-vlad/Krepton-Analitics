jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuote: jest.fn(),
  getCachedStockQuotes: jest.fn(),
}));

jest.mock('../../../services/stockService.js', () => ({
  getStockHistory: jest.fn(),
}));

import { isBacktestPeriod, runStockBacktest } from '../../../services/backtestService.js';
import { getCachedStockQuote, getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import { getStockHistory } from '../../../services/stockService.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';

const mockedQuotes = getCachedStockQuotes as jest.MockedFunction<typeof getCachedStockQuotes>;
const mockedQuote = getCachedStockQuote as jest.MockedFunction<typeof getCachedStockQuote>;
const mockedHistory = getStockHistory as jest.MockedFunction<typeof getStockHistory>;

function candles(firstClose: number, lastClose: number) {
  return [
    { time: 1, open: firstClose, high: firstClose, low: firstClose, close: firstClose, volume: 1 },
    { time: 2, open: lastClose, high: lastClose, low: lastClose, close: lastClose, volume: 1 },
  ];
}

describe('backtestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('AAPL'), name: 'Apple Inc.', price: 150 },
    ]);
    mockedQuote.mockResolvedValue({ ...buildEmptyStockQuote('SPY'), name: 'S&P 500', price: 500 });
    mockedHistory.mockImplementation(async (ticker: string) => ({
      ticker,
      interval: '1d',
      candles: ticker === 'SPY' ? candles(100, 105) : candles(100, 110),
    }));
  });

  it('accepts known backtest periods', () => {
    expect(isBacktestPeriod('3y')).toBe(true);
    expect(isBacktestPeriod('2y')).toBe(false);
  });

  it('compounds allocation growth against the SPY benchmark', async () => {
    const result = await runStockBacktest({
      allocations: [{ ticker: 'aapl', weightPercent: 100 }],
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
    });

    expect(result.portfolio.finalValue).toBe(1100);
    expect(result.portfolio.returnPercent).toBeCloseTo(10);
    expect(result.holdings[0]).toEqual(
      expect.objectContaining({ ticker: 'AAPL', name: 'Apple Inc.', allocatedAmount: 1000 })
    );
    expect(result.benchmark.ticker).toBe('SPY');
    expect(result.benchmark.returnPercent).toBeCloseTo(5);
    expect(result.periodBreakdown).toHaveLength(4);
  });
});
