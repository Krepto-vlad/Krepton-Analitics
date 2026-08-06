import { AppError } from '../../middleware/errorHandler.js';
import {
  ALLOWED_CURRENCIES,
  IMPORT_DEFAULT_CURRENCY,
  IMPORT_MAX_TRADES_PER_FILE,
  TICKER_MAX_LENGTH,
} from '../../constants.js';
import type { ColumnMapping, NormalizedTrade, SkippedImportRow } from '../../types/import.types.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';
import {
  buildRowHash,
  extractCurrencyCodeFromCell,
  mapTransactionType,
  parseNumber,
  parseTradeDate,
  sanitizeText,
  validateTradeInput,
} from './parseUtils.js';

export interface MappedParseResult {
  trades: NormalizedTrade[];
  skipped: SkippedImportRow[];
  /** True when at least one trade used IMPORT_DEFAULT_CURRENCY (no code found in cells). */
  usedDefaultCurrency: boolean;
}

function resolveTradeCurrency(
  row: unknown[],
  columns: ColumnMapping['columns']
): { currency: string; usedDefault: boolean } {
  if (columns.currency !== null) {
    const fromCurrencyColumn =
      extractCurrencyCodeFromCell(row[columns.currency]) ??
      sanitizeText(row[columns.currency], 3).toUpperCase();
    if (ALLOWED_CURRENCIES.includes(fromCurrencyColumn)) {
      return { currency: fromCurrencyColumn, usedDefault: false };
    }
  }

  const fromPrice = extractCurrencyCodeFromCell(row[columns.price]);
  if (fromPrice) {
    return { currency: fromPrice, usedDefault: false };
  }

  return { currency: IMPORT_DEFAULT_CURRENCY, usedDefault: true };
}

export function parseRowsWithMapping(
  sheetData: SafeSheetData,
  mapping: ColumnMapping
): MappedParseResult {
  const { headerRowIndex, columns } = mapping;
  const dataRows = sheetData.rows.slice(headerRowIndex + 1);

  const trades: NormalizedTrade[] = [];
  const skipped: SkippedImportRow[] = [];
  let usedDefaultCurrency = false;

  for (let rowOffset = 0; rowOffset < dataRows.length; rowOffset += 1) {
    const row = dataRows[rowOffset];
    const rowNumber = headerRowIndex + rowOffset + 2;
    const sourceType = sanitizeText(row[columns.side], 64);

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

    const ticker = sanitizeText(row[columns.ticker], TICKER_MAX_LENGTH).toUpperCase();
    const transactionDate = parseTradeDate(row[columns.date]);
    const shares = parseNumber(row[columns.quantity]);
    const pricePerShare = parseNumber(row[columns.price]);
    const { currency, usedDefault } = resolveTradeCurrency(row, columns);

    if (!ticker || !transactionDate || shares === null || pricePerShare === null) {
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

    if (usedDefault) {
      usedDefaultCurrency = true;
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

  return { trades, skipped, usedDefaultCurrency };
}
