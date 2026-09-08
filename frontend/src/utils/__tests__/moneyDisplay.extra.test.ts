import {
  convertAmountWithRate,
  formatMoneyWhole,
  formatSignedMoney,
  getCurrencySymbol,
  getTodayIsoDate,
  resolveEquityHistoryForDisplay,
  resolveInvestmentSummaryForDisplay,
} from '../moneyDisplay';

describe('moneyDisplay extra formatters', () => {
  it('formats compact and whole-dollar amounts', () => {
    expect(formatMoneyWhole(1234, 'USD')).toBe('$1,234');
    expect(formatSignedMoney(-20, 'USD')).toBe('-$20');
  });

  it('prefers display equity values when present', () => {
    const points = resolveEquityHistoryForDisplay(
      [{ time: '2026-01-01', value: 100, displayValue: 90, displayCurrency: 'EUR' }],
      'EUR'
    );
    expect(points[0]?.value).toBe(90);
  });

  it('uses native invested totals when the display currency does not match', () => {
    expect(
      resolveInvestmentSummaryForDisplay(
        { totalInvested: 10, totalWithdrawn: 2, displayCurrency: 'EUR', displayTotalInvested: 9 },
        'USD'
      )
    ).toEqual({ totalInvested: 10, totalWithdrawn: 2 });

    expect(
      resolveInvestmentSummaryForDisplay(
        {
          totalInvested: 10,
          totalWithdrawn: 2,
          displayCurrency: 'USD',
          displayTotalInvested: 11,
          displayTotalWithdrawn: 3,
        },
        'USD'
      )
    ).toEqual({ totalInvested: 11, totalWithdrawn: 3 });
  });

  it('rounds FX conversion and returns a currency symbol', () => {
    expect(convertAmountWithRate(10, 1.234)).toBe(12.34);
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getTodayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
