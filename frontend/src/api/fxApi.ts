import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type { Currency } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';

export interface FxRateResult {
  base: Currency;
  quote: Currency;
  date: string;
  rate: number;
}

const fxApiClient = createApiClient(`${API_BASE_URL}/api/fx`);

const liveRateCache = new Map<string, { rate: number; expiresAt: number }>();
const LIVE_RATE_CACHE_TTL_MS = 5 * 60 * 1000;

function buildCacheKey(from: Currency, to: Currency, date: string): string {
  return `${from}:${to}:${date}`;
}

export async function fetchFxRate(
  from: Currency,
  to: Currency,
  date: string
): Promise<FxRateResult> {
  if (from === to) {
    return { base: from, quote: to, date, rate: 1 };
  }

  const cacheKey = buildCacheKey(from, to, date);
  const cached = liveRateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { base: from, quote: to, date, rate: cached.rate };
  }

  const { data } = await fxApiClient.get<ApiSuccessResponse<FxRateResult> | ApiErrorResponse>(
    '/rate',
    { params: { from, to, date } }
  );

  const result = assertSuccess(data);
  liveRateCache.set(cacheKey, {
    rate: result.rate,
    expiresAt: Date.now() + LIVE_RATE_CACHE_TTL_MS,
  });

  return result;
}

export async function fetchLiveFxRates(
  fromCurrencies: Currency[],
  to: Currency,
  date: string
): Promise<Record<Currency, number>> {
  const uniqueSources = [...new Set(fromCurrencies.filter((currency) => currency !== to))];
  const rates: Partial<Record<Currency, number>> = { [to]: 1 };

  await Promise.all(
    uniqueSources.map(async (from) => {
      const result = await fetchFxRate(from, to, date);
      rates[from] = result.rate;
    })
  );

  return rates as Record<Currency, number>;
}

export function clearLiveFxRateCache(): void {
  liveRateCache.clear();
}
