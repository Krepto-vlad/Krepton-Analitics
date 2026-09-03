import { AppError } from '../middleware/errorHandler.js';
import { ALLOWED_CURRENCIES } from '../constants.js';
import type { DisplayCurrency } from '../types/fx.types.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return ALLOWED_CURRENCIES.includes(value);
}

export function parseDisplayCurrency(
  rawValue: unknown,
  fallback: DisplayCurrency = 'USD'
): DisplayCurrency {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }

  if (typeof rawValue !== 'string') {
    throw new AppError(400, 'displayCurrency must be a string');
  }

  const normalizedValue = rawValue.toUpperCase();
  if (!isDisplayCurrency(normalizedValue)) {
    throw new AppError(400, `displayCurrency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
  }

  return normalizedValue;
}

export function assertIsoDate(value: string, fieldName: string): void {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new AppError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }
}

export function getTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildFxRateLookupKey(
  fromCurrency: string,
  toCurrency: string,
  date: string
): string {
  return `${fromCurrency}:${toCurrency}:${date}`;
}
