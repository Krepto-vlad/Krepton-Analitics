import { formatMoney, formatSignedMoney, convertAmountToDisplayCurrency } from '../moneyDisplay';
import type { Currency } from '../../constants';

describe('moneyDisplay', () => {
  it('formats USD with two fraction digits', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('prefixes a plus sign for non-negative signed amounts', () => {
    expect(formatSignedMoney(150, 'USD')).toBe('+$150');
  });

  it('converts between display currencies and keeps the same currency unchanged', () => {
    const fxRates: Record<Currency, number> = { USD: 1, EUR: 1.1 };

    expect(convertAmountToDisplayCurrency(100, 'USD', 'USD', fxRates)).toBe(100);
    expect(convertAmountToDisplayCurrency(100, 'EUR', 'USD', fxRates)).toBe(110);
  });
});
