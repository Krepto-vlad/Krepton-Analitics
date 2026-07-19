import {
  clearFxRateCacheForTests,
  getFxRate,
  getFxRatesForRange,
} from '../../../services/fxRateService.js';
import { convertWithRate, roundMoney } from '../../../services/currencyConversionService.js';

describe('fxRateService', () => {
  beforeEach(() => {
    clearFxRateCacheForTests();
    jest.restoreAllMocks();
  });

  it('returns 1 for identical currencies without calling the provider', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const result = await getFxRate('USD', 'USD', '2026-01-12');

    expect(result.rate).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches and caches a historical FX rate', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'USD',
        date: '2026-01-12',
        rates: { EUR: 0.92 },
      }),
    } as Response);

    const firstResult = await getFxRate('USD', 'EUR', '2026-01-12');
    const secondResult = await getFxRate('USD', 'EUR', '2026-01-12');

    expect(firstResult.rate).toBe(0.92);
    expect(secondResult.rate).toBe(0.92);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches FX rates for a date range', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'USD',
        start_date: '2026-01-10',
        end_date: '2026-01-11',
        rates: {
          '2026-01-10': { EUR: 0.91 },
          '2026-01-11': { EUR: 0.92 },
        },
      }),
    } as Response);

    const result = await getFxRatesForRange('USD', 'EUR', '2026-01-10', '2026-01-11');

    expect(result.rates['2026-01-10']).toBe(0.91);
    expect(result.rates['2026-01-11']).toBe(0.92);
  });
});

describe('currencyConversionService', () => {
  it('rounds and converts monetary values', () => {
    expect(roundMoney(10.126)).toBe(10.13);
    expect(convertWithRate(100, 0.92)).toBe(92);
  });
});
