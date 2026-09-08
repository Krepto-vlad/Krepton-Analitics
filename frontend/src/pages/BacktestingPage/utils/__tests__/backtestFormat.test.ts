import type { StockBacktestResponse } from '../../../../types/stock.types';
import {
  convertBacktestResponseForDisplay,
  formatBacktestMoney,
  formatBacktestPercent,
} from '../backtestFormat';

const sample: StockBacktestResponse = {
  amount: 1000,
  displayCurrency: 'USD',
  period: '5y',
  periodLabel: '5 years',
  portfolio: { returnPercent: 100, finalValue: 2000, currency: 'USD' },
  holdings: [
    {
      ticker: 'AAPL',
      name: 'Apple',
      currency: 'USD',
      weightPercent: 100,
      allocatedAmount: 1000,
      returnPercent: 100,
      contributionValue: 2000,
    },
  ],
  benchmark: {
    label: 'S&P 500',
    ticker: 'SPY',
    returnPercent: 80,
    finalValue: 1800,
    currency: 'USD',
  },
  periodBreakdown: [],
};

describe('backtestFormat', () => {
  it('formats signed percents and whole money', () => {
    expect(formatBacktestPercent(12.34)).toBe('+12.3%');
    expect(formatBacktestPercent(-1.2)).toBe('-1.2%');
    expect(formatBacktestMoney(1500, 'USD')).toBe('$1,500');
  });

  it('converts nested money fields with an FX rate', () => {
    const converted = convertBacktestResponseForDisplay(sample, 2, 'EUR');
    expect(converted.amount).toBe(2000);
    expect(converted.displayCurrency).toBe('EUR');
    expect(converted.portfolio.finalValue).toBe(4000);
    expect(converted.holdings[0]?.allocatedAmount).toBe(2000);
    expect(converted.benchmark.finalValue).toBe(3600);
  });
});
