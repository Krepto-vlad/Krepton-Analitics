import { createHash } from 'node:crypto';
import { AppError } from '../../middleware/errorHandler.js';
import {
  ALLOWED_CURRENCIES,
  MAX_PRICE,
  MAX_SHARES,
  TICKER_MAX_LENGTH,
  IMPORT_MAX_TRADES_PER_FILE,
} from '../../constants.js';
import { isValidTickerSymbol } from '../../utils/tickerValidation.js';
import type { NormalizedTrade, SkippedImportRow } from '../../types/import.types.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';

const REVOLUT_HEADERS = [
  'date',
  'ticker',
  'type',
  'quantity',
  'price per share',
  'total amount',
  'currency',
  'fx rate',
] as const;

export interface RevolutParseResult {
  trades: NormalizedTrade[];
  skipped: SkippedImportRow[];
}

function sanitizeText(value: unknown, maxLength: number): string {
  const cleaned = String(value ?? '')
    .split('')
    .filter((char) => {
      const charCode = char.charCodeAt(0);
      return charCode >= 32 && charCode !== 127;
    })
    .join('');

  return cleaned.trim().slice(0, maxLength);
}

function parseNumber(value: unknown): number | null {
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

function parseIsoDate(value: unknown): string | null {
  const raw = sanitizeText(value, 40);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeHeader(value: unknown): string {
  return sanitizeText(value, 64).toLowerCase();
}

function mapTransactionType(sourceType: string): 'BUY' | 'SELL' | null {
  const normalized = sourceType.toUpperCase();
  if (normalized.startsWith('BUY')) {
    return 'BUY';
  }
  if (normalized.startsWith('SELL')) {
    return 'SELL';
  }
  return null;
}

function buildRowHash(parts: Record<string, string | number>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function validateTradeInput(params: {
  ticker: string;
  shares: number;
  pricePerShare: number;
  currency: string;
}): string | null {
  if (!isValidTickerSymbol(params.ticker)) {
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

function assertRevolutHeaders(headerRow: unknown[]): void {
  const normalizedHeaders = headerRow.map(normalizeHeader);

  for (const expectedHeader of REVOLUT_HEADERS) {
    if (!normalizedHeaders.includes(expectedHeader)) {
      throw new AppError(
        400,
        'File does not match Revolut account statement format. Check broker selection and export type.'
      );
    }
  }
}

function getColumnIndex(headerRow: unknown[], headerName: string): number {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  return normalizedHeaders.indexOf(headerName);
}

export function parseRevolutStatement(sheetData: SafeSheetData): RevolutParseResult {
  const [headerRow, ...dataRows] = sheetData.rows;

  if (!headerRow || headerRow.length === 0) {
    throw new AppError(400, 'Revolut statement is missing a header row');
  }

  assertRevolutHeaders(headerRow);

  const dateIndex = getColumnIndex(headerRow, 'date');
  const tickerIndex = getColumnIndex(headerRow, 'ticker');
  const typeIndex = getColumnIndex(headerRow, 'type');
  const quantityIndex = getColumnIndex(headerRow, 'quantity');
  const priceIndex = getColumnIndex(headerRow, 'price per share');
  const currencyIndex = getColumnIndex(headerRow, 'currency');

  const trades: NormalizedTrade[] = [];
  const skipped: SkippedImportRow[] = [];

  for (let rowOffset = 0; rowOffset < dataRows.length; rowOffset += 1) {
    const row = dataRows[rowOffset];
    const rowNumber = rowOffset + 2;
    const sourceType = sanitizeText(row[typeIndex], 64);

    if (!sourceType) {
      skipped.push({ rowNumber, sourceType: 'EMPTY', reason: 'Missing transaction type' });
      continue;
    }

    const transactionType = mapTransactionType(sourceType);
    if (!transactionType) {
      skipped.push({
        rowNumber,
        sourceType,
        reason: 'Non-trade row skipped (cash movements, dividends, fees)',
      });
      continue;
    }

    const ticker = sanitizeText(row[tickerIndex], TICKER_MAX_LENGTH).toUpperCase();
    const transactionDate = parseIsoDate(row[dateIndex]);
    const shares = parseNumber(row[quantityIndex]);
    const pricePerShare = parseNumber(row[priceIndex]);
    const currency = sanitizeText(row[currencyIndex], 3).toUpperCase();

    if (!ticker || !transactionDate || shares === null || pricePerShare === null || !currency) {
      skipped.push({
        rowNumber,
        sourceType,
        reason: 'Trade row is missing required fields',
      });
      continue;
    }

    const validationError = validateTradeInput({ ticker, shares, pricePerShare, currency });
    if (validationError) {
      skipped.push({ rowNumber, sourceType, reason: validationError });
      continue;
    }

    const sourceRowHash = buildRowHash({
      rowNumber,
      ticker,
      sourceType,
      transactionDate,
      shares,
      pricePerShare,
      currency,
    });

    trades.push({
      rowNumber,
      ticker,
      companyName: ticker,
      transactionType,
      shares,
      pricePerShare,
      currency,
      transactionDate,
      sourceType,
      sourceRowHash,
    });
  }

  if (trades.length > IMPORT_MAX_TRADES_PER_FILE) {
    throw new AppError(400, `File contains too many trades (max ${IMPORT_MAX_TRADES_PER_FILE})`);
  }

  trades.sort((left, right) => left.transactionDate.localeCompare(right.transactionDate));

  return { trades, skipped };
}
