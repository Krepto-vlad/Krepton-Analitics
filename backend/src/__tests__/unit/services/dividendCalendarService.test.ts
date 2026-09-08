const mockChart = jest.fn();

jest.mock('yahoo-finance2', () =>
  jest.fn().mockImplementation(() => ({
    chart: (...args: unknown[]) => mockChart(...args),
  }))
);

jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuote: jest.fn(),
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { DIVIDEND_UPCOMING_PAYMENTS_LIMIT, MONTH_LABELS } from '../../../constants.js';
import { buildPortfolioDividendCalendar } from '../../../services/dividendCalendarService.js';
import { getCachedStockQuote } from '../../../services/quoteCacheService.js';
import type { PositionRow } from '../../../types/portfolio.types.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';

const mockedQuote = getCachedStockQuote as jest.MockedFunction<typeof getCachedStockQuote>;

function position(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    id: 'pos-1',
    portfolio_id: 'pf-1',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    shares: '10',
    avg_buy_price: '100',
    currency: 'USD',
    sector: 'Technology',
    entry_date: '2024-01-01',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function dividendEvent(isoDate: string, amount: number): { date: Date; amount: number } {
  return { date: new Date(`${isoDate}T00:00:00.000Z`), amount };
}

describe('dividendCalendarService', () => {
  beforeEach(() => {
    mockChart.mockReset();
    mockedQuote.mockReset();
    mockedQuote.mockResolvedValue({ ...buildEmptyStockQuote('AAPL'), currency: 'USD', price: 190 });
  });

  it('returns an empty calendar when there are no positions', async () => {
    const result = await buildPortfolioDividendCalendar([], 'USD');

    expect(mockChart).not.toHaveBeenCalled();
    expect(result.summary).toEqual({
      annualIncome: 0,
      avgMonthlyIncome: 0,
      remainingYearIncome: 0,
    });
    expect(result.monthlyPayouts).toHaveLength(MONTH_LABELS.length);
    expect(result.upcomingPayments).toEqual([]);
  });

  it('builds monthly payouts and upcoming payments from Yahoo dividend events', async () => {
    const now = new Date();
    const past = new Date(now);
    past.setMonth(past.getMonth() - 3);
    const older = new Date(now);
    older.setMonth(older.getMonth() - 6);

    mockChart.mockResolvedValue({
      events: {
        dividends: [
          dividendEvent(older.toISOString().slice(0, 10), 0.24),
          dividendEvent(past.toISOString().slice(0, 10), 0.25),
        ],
      },
    });

    const result = await buildPortfolioDividendCalendar([position()], 'USD');

    expect(result.displayCurrency).toBe('USD');
    expect(result.monthlyPayouts).toHaveLength(MONTH_LABELS.length);
    expect(result.upcomingPayments.length).toBeLessThanOrEqual(DIVIDEND_UPCOMING_PAYMENTS_LIMIT);
    expect(result.summary.annualIncome).toBeGreaterThanOrEqual(0);
  });

  it('reuses cached dividend history on a second call', async () => {
    mockChart.mockResolvedValue({
      events: {
        dividends: [dividendEvent('2026-01-15', 0.22), dividendEvent('2026-04-15', 0.22)],
      },
    });

    await buildPortfolioDividendCalendar(
      [position({ ticker: 'MSFT', company_name: 'Microsoft' })],
      'USD'
    );
    await buildPortfolioDividendCalendar(
      [position({ ticker: 'MSFT', company_name: 'Microsoft' })],
      'USD'
    );

    expect(mockChart).toHaveBeenCalledTimes(1);
  });

  it('treats a Yahoo failure as no dividend history', async () => {
    mockChart.mockRejectedValue(new Error('yahoo down'));
    mockedQuote.mockRejectedValue(new Error('quote down'));

    const result = await buildPortfolioDividendCalendar(
      [position({ ticker: 'ZZZZ', company_name: 'Unknown' })],
      'USD'
    );

    expect(result.upcomingPayments).toEqual([]);
    expect(result.summary.annualIncome).toBe(0);
  });
});
