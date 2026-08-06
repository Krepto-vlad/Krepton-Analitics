import { createHash } from 'node:crypto';
import {
  ALLOWED_CURRENCIES,
  MAX_PRICE,
  MAX_SHARES,
  TICKER_MAX_LENGTH,
  type AllowedCurrency,
} from '../../constants.js';
import { isValidTickerSymbol } from '../../utils/tickerValidation.js';

export function sanitizeText(value: unknown, maxLength: number): string {
  const cleaned = String(value ?? '')
    .split('')
    .filter((char) => {
      const charCode = char.charCodeAt(0);
      return charCode >= 32 && charCode !== 127;
    })
    .join('');

  return cleaned.trim().slice(0, maxLength);
}

/**
 * Aggressive header normalization for cross-broker matching
 * (e.g. "No. of shares", "Price / share", "Currency (Price / share)").
 */
export function normalizeHeader(value: unknown): string {
  return sanitizeText(value, 96)
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[_/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/,/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Extracts an allowed ISO currency from cells like "USD 340.61", "340.61 EUR", or bare "USD".
 * Used when brokers embed currency in the price/amount column instead of a dedicated field.
 */
export function extractCurrencyCodeFromCell(value: unknown): AllowedCurrency | null {
  const raw = sanitizeText(value, 32).toUpperCase();
  if (!raw) {
    return null;
  }

  for (const currency of ALLOWED_CURRENCIES) {
    const escaped = currency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
    if (pattern.test(raw) || raw === currency) {
      return currency;
    }
  }

  return null;
}

export function parseTradeDate(value: unknown): string | null {
  const raw = sanitizeText(value, 40);
  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (slashMatch) {
    const first = Number.parseInt(slashMatch[1], 10);
    const second = Number.parseInt(slashMatch[2], 10);
    const year = slashMatch[3];
    // If second > 12 it must be MM/DD; otherwise default to DD/MM (common EU broker exports).
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function mapTransactionType(sourceType: string): 'BUY' | 'SELL' | null {
  const normalized = sourceType.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === 'B' ||
    normalized === 'BUY' ||
    normalized.startsWith('BUY') ||
    normalized.includes('PURCHASE') ||
    normalized.includes('MARKET BUY')
  ) {
    return 'BUY';
  }

  if (
    normalized === 'S' ||
    normalized === 'SELL' ||
    normalized.startsWith('SELL') ||
    normalized.includes('MARKET SELL')
  ) {
    return 'SELL';
  }

  return null;
}

export function buildRowHash(parts: Record<string, string | number>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function buildHeaderFingerprint(normalizedHeaders: string[]): string {
  return createHash('sha256').update(normalizedHeaders.join('|')).digest('hex').slice(0, 16);
}

export function validateTradeInput(params: {
  ticker: string;
  shares: number;
  pricePerShare: number;
  currency: string;
}): string | null {
  if (!isValidTickerSymbol(params.ticker) || params.ticker.length > TICKER_MAX_LENGTH) {
    return 'Invalid ticker format';
  }

  if (params.shares <= 0 || params.shares > MAX_SHARES) {
    return 'Invalid share quantity';
  }

  if (params.pricePerShare <= 0 || params.pricePerShare > MAX_PRICE) {
    return 'Invalid price per share';
  }

  if (!ALLOWED_CURRENCIES.includes(params.currency)) {
    return `Unsupported currency: ${params.currency}`;
  }

  return null;
}

export function getColumnIndex(headerRow: unknown[], headerName: string): number {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  return normalizedHeaders.indexOf(normalizeHeader(headerName));
}
