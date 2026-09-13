import { createHash } from 'node:crypto';
import { ALLOWED_CURRENCIES } from '../constants.js';
import type { NormalizedTrade, SkippedImportRow } from '../types/import.types.js';
import { isValidTickerSymbol, normalizeTickerSymbol } from '../utils/tickerValidation.js';

const SKIPPED_INSTRUMENT_KINDS = new Set([
  'option',
  'opt',
  'crypto',
  'cryptocurrency',
  'cfd',
  'forex',
  'currency',
  'future',
  'futures',
]);

export interface SnaptradeMappedHoldings {
  trades: NormalizedTrade[];
  skipped: SkippedImportRow[];
}

export interface SnaptradePositionLike {
  symbol?: unknown;
  option_symbol?: unknown;
  units?: unknown;
  average_purchase_price?: unknown;
  price?: unknown;
  currency?: unknown;
  instrument?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNestedString(value: unknown, keys: string[]): string | null {
  let current: unknown = value;

  for (const key of keys) {
    if (typeof current === 'string') {
      return asNonEmptyString(current);
    }

    const record = asRecord(current);
    if (!record) {
      return null;
    }

    current = record[key];
  }

  return asNonEmptyString(current);
}

function resolveRawTicker(position: SnaptradePositionLike): string | null {
  return (
    readNestedString(position.instrument, ['symbol']) ??
    readNestedString(position.symbol, ['raw_symbol']) ??
    readNestedString(position.symbol, ['symbol', 'symbol']) ??
    readNestedString(position.symbol, ['symbol'])
  );
}

function resolveCompanyName(position: SnaptradePositionLike, ticker: string): string {
  return (
    readNestedString(position.instrument, ['description']) ??
    readNestedString(position.symbol, ['description']) ??
    readNestedString(position.symbol, ['symbol', 'description']) ??
    ticker
  );
}

function resolveInstrumentKind(position: SnaptradePositionLike): string | null {
  const kind =
    readNestedString(position.instrument, ['kind']) ??
    readNestedString(position.symbol, ['type', 'code']) ??
    readNestedString(position.symbol, ['symbol', 'type', 'code']);

  return kind ? kind.toLowerCase() : null;
}

export function normalizeSnaptradeTicker(rawTicker: string): string | null {
  const normalized = normalizeTickerSymbol(rawTicker);
  if (isValidTickerSymbol(normalized)) {
    return normalized;
  }

  const withoutBrokerSuffix = normalized.split('_')[0] ?? '';
  if (withoutBrokerSuffix.length > 0 && isValidTickerSymbol(withoutBrokerSuffix)) {
    return normalizeTickerSymbol(withoutBrokerSuffix);
  }

  return null;
}

function resolveCurrency(position: SnaptradePositionLike): string | null {
  const code =
    readNestedString(position.currency, ['code']) ??
    (typeof position.currency === 'string' ? position.currency : null) ??
    readNestedString(position.symbol, ['currency', 'code']) ??
    readNestedString(position.instrument, ['currency']);

  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  return ALLOWED_CURRENCIES.includes(normalized) ? normalized : null;
}

function shouldSkipInstrument(position: SnaptradePositionLike, kind: string | null): string | null {
  if (position.option_symbol) {
    return 'Options are not imported';
  }

  if (!kind) {
    return null;
  }

  if (SKIPPED_INSTRUMENT_KINDS.has(kind)) {
    return `${kind} positions are not imported`;
  }

  return null;
}

function buildSourceRowHash(
  ticker: string,
  shares: number,
  pricePerShare: number,
  currency: string
): string {
  return createHash('sha256')
    .update(`${ticker}|${shares}|${pricePerShare}|${currency}`)
    .digest('hex')
    .slice(0, 32);
}

export function mapSnaptradePositionsToTrades(
  positions: SnaptradePositionLike[],
  snapshotDate: string
): SnaptradeMappedHoldings {
  const trades: NormalizedTrade[] = [];
  const skipped: SkippedImportRow[] = [];

  positions.forEach((position, index) => {
    const rowNumber = index + 1;
    const kind = resolveInstrumentKind(position);
    const instrumentSkipReason = shouldSkipInstrument(position, kind);
    if (instrumentSkipReason) {
      skipped.push({ rowNumber, sourceType: 'snaptrade', reason: instrumentSkipReason });
      return;
    }

    const rawTicker = resolveRawTicker(position);
    if (!rawTicker) {
      skipped.push({ rowNumber, sourceType: 'snaptrade', reason: 'Missing ticker' });
      return;
    }

    const ticker = normalizeSnaptradeTicker(rawTicker);
    if (!ticker) {
      skipped.push({
        rowNumber,
        sourceType: 'snaptrade',
        reason: `Unsupported ticker "${rawTicker}"`,
      });
      return;
    }

    const shares = asFiniteNumber(position.units);
    if (shares === null || shares <= 0) {
      skipped.push({ rowNumber, sourceType: 'snaptrade', reason: 'Quantity is missing or zero' });
      return;
    }

    const pricePerShare =
      asFiniteNumber(position.average_purchase_price) ?? asFiniteNumber(position.price);
    if (pricePerShare === null || pricePerShare <= 0) {
      skipped.push({
        rowNumber,
        sourceType: 'snaptrade',
        reason: 'Average purchase price is missing',
      });
      return;
    }

    const currency = resolveCurrency(position);
    if (!currency) {
      skipped.push({
        rowNumber,
        sourceType: 'snaptrade',
        reason: 'Only USD and EUR holdings can be synced',
      });
      return;
    }

    trades.push({
      rowNumber,
      ticker,
      companyName: resolveCompanyName(position, ticker).slice(0, 255),
      transactionType: 'BUY',
      shares,
      pricePerShare,
      currency,
      transactionDate: snapshotDate,
      sourceType: 'snaptrade',
      sourceRowHash: buildSourceRowHash(ticker, shares, pricePerShare, currency),
    });
  });

  return { trades, skipped };
}
