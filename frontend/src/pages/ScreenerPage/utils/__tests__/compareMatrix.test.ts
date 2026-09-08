import type { StockCompareItem } from '../../../../types/stock.types';
import {
  formatCompareMetricValue,
  getBestTickersForMetric,
  getCompareMetricSecondaryValue,
  getVisibleCompareMetrics,
  hasCompareMetricData,
} from '../compareMatrix';

const context = { displayCurrency: 'USD' as const, fxRates: { USD: 1, EUR: 1.1 } };

function item(overrides: Partial<StockCompareItem>): StockCompareItem {
  return {
    ticker: 'AAPL',
    name: 'Apple',
    currency: 'USD',
    price: 100,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 1_000_000_000,
    enterpriseValue: null,
    trailingEps: 6,
    peRatio: 20,
    forwardPeRatio: null,
    pegRatio: null,
    psRatio: null,
    priceToBook: null,
    evToEbitda: null,
    roe: 15,
    roa: null,
    profitMargin: null,
    operatingMargin: null,
    revenueGrowth: null,
    earningsGrowth: null,
    debtToEquity: 0.5,
    currentRatio: null,
    dividendYield: 0.5,
    payoutRatio: null,
    beta: 1.2,
    ...overrides,
  };
}

describe('compareMatrix', () => {
  it('formats money, ratios, percents, and missing values', () => {
    const apple = item({});
    expect(formatCompareMetricValue('price', apple, context)).toContain('100');
    expect(formatCompareMetricValue('sector', apple, context)).toBe('Technology');
    expect(formatCompareMetricValue('peRatio', apple, context)).toBe('20.0x');
    expect(formatCompareMetricValue('roe', apple, context)).toBe('15.00%');
    expect(formatCompareMetricValue('beta', apple, context)).toBe('1.20');
    expect(formatCompareMetricValue('enterpriseValue', apple, context)).toBe('—');
    expect(getCompareMetricSecondaryValue('sector', apple)).toBe('Consumer Electronics');
    expect(getCompareMetricSecondaryValue('price', apple)).toBeNull();
  });

  it('hides metrics with no data and highlights the better ticker', () => {
    const apple = item({ ticker: 'AAPL', peRatio: 10, roe: 20 });
    const msft = item({ ticker: 'MSFT', peRatio: 30, roe: 10, sector: null, industry: null });

    expect(hasCompareMetricData('pegRatio', [apple, msft])).toBe(false);
    expect(getVisibleCompareMetrics([apple, msft]).map((metric) => metric.key)).toEqual(
      expect.arrayContaining(['price', 'peRatio', 'roe'])
    );
    expect([...getBestTickersForMetric('peRatio', [apple, msft])]).toEqual(['AAPL']);
    expect([...getBestTickersForMetric('roe', [apple, msft])]).toEqual(['AAPL']);
    expect(getBestTickersForMetric('beta', [apple, msft]).size).toBe(0);
  });
});
