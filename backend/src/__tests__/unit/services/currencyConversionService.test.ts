import { computeNativeInvestmentTotals } from '../../../services/currencyConversionService.js';
import type { TransactionRow } from '../../../types/portfolio.types.js';

describe('computeNativeInvestmentTotals', () => {
  it('sums buys and treats orphaned sells as invested capital', () => {
    const transactions: TransactionRow[] = [
      {
        id: '1',
        portfolio_id: 'p1',
        ticker: 'AAPL',
        company_name: 'Apple',
        shares: '2',
        price_per_share: '100',
        currency: 'USD',
        transaction_date: '2026-01-10',
        transaction_type: 'BUY',
        created_at: new Date('2026-01-10T00:00:00.000Z'),
      },
      {
        id: '2',
        portfolio_id: 'p1',
        ticker: 'MSFT',
        company_name: 'Microsoft',
        shares: '1',
        price_per_share: '50',
        currency: 'EUR',
        transaction_date: '2026-01-11',
        transaction_type: 'SELL',
        created_at: new Date('2026-01-11T00:00:00.000Z'),
      },
    ];

    const totals = computeNativeInvestmentTotals(transactions);

    expect(totals.totalInvested).toBe(250);
    expect(totals.totalWithdrawn).toBe(50);
  });
});
