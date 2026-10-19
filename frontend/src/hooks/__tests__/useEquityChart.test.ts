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
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the full series for ALL and filters shorter windows', () => {
    expect(filterHistoryByPeriod(history, 'ALL')).toHaveLength(3);
    expect(filterHistoryByPeriod(history, '1W').map((point) => point.time)).toEqual(['2026-09-08']);
    expect(filterHistoryByPeriod(history, '1M').map((point) => point.time)).toEqual([
      '2026-09-01',
      '2026-09-08',
    ]);
    expect(filterHistoryByPeriod(history, '3M')).toHaveLength(2);
    expect(filterHistoryByPeriod(history, '6M')).toHaveLength(2);
    expect(filterHistoryByPeriod(history, '1Y')).toHaveLength(2);
  });

  it('formats prices below one thousand without compact notation', () => {
    expect(formatChartPrice(80, 'USD')).toContain('80');
  });
});
