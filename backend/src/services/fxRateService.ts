import { AppError } from '../middleware/errorHandler.js';
import {
  FRANKFURTER_API_BASE_URL,
  FX_API_TIMEOUT_MS,
  FX_HISTORICAL_RATE_CACHE_TTL_MS,
  FX_TODAY_RATE_CACHE_TTL_MS,
  FX_MAX_RANGE_DAYS,
} from '../constants.js';
import type {
  DisplayCurrency,
  FrankfurterRangeResponse,
  FrankfurterSingleResponse,
  FxRateResponse,
  FxRatesRangeResponse,
} from '../types/fx.types.js';
import {
  assertIsoDate,
  buildFxRateLookupKey,
  getTodayIsoDate,
  isDisplayCurrency,
} from '../utils/displayCurrency.js';

interface FxCacheEntry {
  rate: number;
  expiresAt: number;
}

const fxRateCache = new Map<string, FxCacheEntry>();

function getCacheTtlMs(date: string): number {
  return date >= getTodayIsoDate() ? FX_TODAY_RATE_CACHE_TTL_MS : FX_HISTORICAL_RATE_CACHE_TTL_MS;
}

function readCachedRate(cacheKey: string): number | null {
  const cachedEntry = fxRateCache.get(cacheKey);
  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    fxRateCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.rate;
}

function writeCachedRate(cacheKey: string, rate: number, date: string): void {
  fxRateCache.set(cacheKey, {
    rate,
    expiresAt: Date.now() + getCacheTtlMs(date),
  });
}

function assertSupportedCurrencyPair(baseCurrency: string, quoteCurrency: string): void {
  if (!isDisplayCurrency(baseCurrency) || !isDisplayCurrency(quoteCurrency)) {
    throw new AppError(400, 'Only USD and EUR currency pairs are supported');
  }
}

async function fetchFrankfurterJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FX_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new AppError(502, 'FX rate provider is temporarily unavailable');
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(502, 'Failed to fetch FX rates');
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateDateOrder(startDate: string, endDate: string): void {
  if (startDate > endDate) {
    throw new AppError(400, 'fromDate must be on or before toDate');
  }

  const startTimestamp = new Date(startDate).getTime();
  const endTimestamp = new Date(endDate).getTime();
  const rangeDays = Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));

  if (rangeDays > FX_MAX_RANGE_DAYS) {
    throw new AppError(400, `FX date range cannot exceed ${FX_MAX_RANGE_DAYS} days`);
  }
}

export async function getFxRate(
  baseCurrency: DisplayCurrency,
  quoteCurrency: DisplayCurrency,
  date: string
): Promise<FxRateResponse> {
  assertIsoDate(date, 'date');
  assertSupportedCurrencyPair(baseCurrency, quoteCurrency);

  if (baseCurrency === quoteCurrency) {
    return {
      base: baseCurrency,
      quote: quoteCurrency,
      date,
      rate: 1,
    };
  }

  const cacheKey = buildFxRateLookupKey(baseCurrency, quoteCurrency, date);
  const cachedRate = readCachedRate(cacheKey);
  if (cachedRate !== null) {
    return {
      base: baseCurrency,
      quote: quoteCurrency,
      date,
      rate: cachedRate,
    };
  }

  const url = `${FRANKFURTER_API_BASE_URL}/${date}?from=${baseCurrency}&to=${quoteCurrency}`;
  const payload = await fetchFrankfurterJson<FrankfurterSingleResponse>(url);
  const rate = payload.rates[quoteCurrency];

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new AppError(
      502,
      `FX rate not available for ${baseCurrency}/${quoteCurrency} on ${date}`
    );
  }

  writeCachedRate(cacheKey, rate, date);

  return {
    base: baseCurrency,
    quote: quoteCurrency,
    date,
    rate,
  };
}

export async function getFxRatesForRange(
  baseCurrency: DisplayCurrency,
  quoteCurrency: DisplayCurrency,
  startDate: string,
  endDate: string
): Promise<FxRatesRangeResponse> {
  assertIsoDate(startDate, 'fromDate');
  assertIsoDate(endDate, 'toDate');
  validateDateOrder(startDate, endDate);
  assertSupportedCurrencyPair(baseCurrency, quoteCurrency);

  if (baseCurrency === quoteCurrency) {
    return {
      base: baseCurrency,
      quote: quoteCurrency,
      startDate,
      endDate,
      rates: {},
    };
  }

  const url =
    `${FRANKFURTER_API_BASE_URL}/${startDate}..${endDate}` +
    `?from=${baseCurrency}&to=${quoteCurrency}`;
  const payload = await fetchFrankfurterJson<FrankfurterRangeResponse>(url);

  const normalizedRates: Record<string, number> = {};

  for (const [rateDate, rateByCurrency] of Object.entries(payload.rates)) {
    const rate = rateByCurrency[quoteCurrency];
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      continue;
    }

    normalizedRates[rateDate] = rate;
    writeCachedRate(buildFxRateLookupKey(baseCurrency, quoteCurrency, rateDate), rate, rateDate);
  }

  return {
    base: baseCurrency,
    quote: quoteCurrency,
    startDate,
    endDate,
    rates: normalizedRates,
  };
}

export async function getFxRateFromLookup(
  lookup: Map<string, number>,
  baseCurrency: string,
  quoteCurrency: DisplayCurrency,
  date: string
): Promise<number> {
  if (baseCurrency === quoteCurrency) {
    return 1;
  }

  if (!isDisplayCurrency(baseCurrency)) {
    throw new AppError(400, `Unsupported source currency: ${baseCurrency}`);
  }

  const cacheKey = buildFxRateLookupKey(baseCurrency, quoteCurrency, date);
  const cachedRate = lookup.get(cacheKey) ?? readCachedRate(cacheKey);
  if (cachedRate !== undefined && cachedRate !== null) {
    lookup.set(cacheKey, cachedRate);
    return cachedRate;
  }

  const fetchedRate = await getFxRate(baseCurrency, quoteCurrency, date);
  lookup.set(cacheKey, fetchedRate.rate);
  return fetchedRate.rate;
}

export async function preloadFxRates(
  lookup: Map<string, number>,
  baseCurrency: DisplayCurrency,
  quoteCurrency: DisplayCurrency,
  dates: string[]
): Promise<void> {
  if (baseCurrency === quoteCurrency || dates.length === 0) {
    return;
  }

  const uniqueDates = [...new Set(dates)].sort();
  const missingDates = uniqueDates.filter((date) => {
    const cacheKey = buildFxRateLookupKey(baseCurrency, quoteCurrency, date);
    return lookup.get(cacheKey) === undefined && readCachedRate(cacheKey) === null;
  });

  if (missingDates.length === 0) {
    return;
  }

  const startDate = missingDates[0];
  const endDate = missingDates[missingDates.length - 1];
  const rangeRates = await getFxRatesForRange(baseCurrency, quoteCurrency, startDate, endDate);

  for (const date of missingDates) {
    const exactRate = rangeRates.rates[date];
    if (exactRate !== undefined) {
      const cacheKey = buildFxRateLookupKey(baseCurrency, quoteCurrency, date);
      lookup.set(cacheKey, exactRate);
      continue;
    }

    const fallbackRate = await getFxRate(baseCurrency, quoteCurrency, date);
    lookup.set(buildFxRateLookupKey(baseCurrency, quoteCurrency, date), fallbackRate.rate);
  }
}

/** @internal Test helper */
export function clearFxRateCacheForTests(): void {
  fxRateCache.clear();
}
