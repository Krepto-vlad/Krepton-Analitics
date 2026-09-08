import type { EquityDataPoint } from '../../types/portfolio.types';
import { filterHistoryByPeriod, formatChartPrice } from '../useEquityChart';

jest.mock(
  'lightweight-charts',
  () => ({
    ColorType: { Solid: 'solid' },
    AreaSeries: 'AreaSeries',
    createChart: jest.fn(),
  }),
  { virtual: true }
);

const history: EquityDataPoint[] = [
  { time: '2020-01-01', value: 10 },
  { time: '2026-09-01', value: 50 },
  { time: '2026-09-08', value: 80 },
];

describe('useEquityChart helpers', () => {
  it('keeps the full series for ALL and filters shorter windows', () => {
    expect(filterHistoryByPeriod(history, 'ALL')).toHaveLength(3);
    expect(filterHistoryByPeriod(history, '1W').every((point) => point.time >= '2026-08-01')).toBe(
      true
    );
    expect(filterHistoryByPeriod(history, '1M').length).toBeGreaterThan(0);
    expect(filterHistoryByPeriod(history, '3M').length).toBeGreaterThan(0);
    expect(filterHistoryByPeriod(history, '6M').length).toBeGreaterThan(0);
    expect(filterHistoryByPeriod(history, '1Y').length).toBeGreaterThan(0);
  });

  it('formats prices below one thousand without compact notation', () => {
    expect(formatChartPrice(80, 'USD')).toContain('80');
  });
});
