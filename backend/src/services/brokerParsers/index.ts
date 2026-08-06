import { AppError } from '../../middleware/errorHandler.js';
import { isGeminiConfigured } from '../../config/env.js';
import { IMPORT_DEFAULT_CURRENCY } from '../../constants.js';
import type { BrokerParseMeta, BrokerParseResult } from '../../types/import.types.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';
import { inferImportSchemaWithGemini } from '../geminiClient.js';
import { assertAiQuotaAvailable, recordAiUsage } from '../aiQuotaService.js';
import { mapColumnsHeuristically } from './heuristicColumnMapper.js';
import { buildGdprSafeSchemaSample } from './importSchemaSample.js';
import { parseRowsWithMapping } from './mappedRowParser.js';

function buildHeuristicWarning(missingCurrency: boolean, usedDefaultCurrency: boolean): string {
  const base =
    'Column mapping was auto-detected from headers. Please verify the preview before importing.';
  if (!missingCurrency) {
    return base;
  }
  if (usedDefaultCurrency) {
    return `${base} No dedicated currency column — codes in price cells are used when present, otherwise ${IMPORT_DEFAULT_CURRENCY}.`;
  }
  return `${base} No dedicated currency column — currency was read from price cell values.`;
}

function buildAiWarning(missingCurrency: boolean, usedDefaultCurrency: boolean): string {
  const base =
    'AI-assisted column mapping used a truncated sample only (full file was not sent to AI). Please verify carefully before importing.';
  if (!missingCurrency) {
    return base;
  }
  if (usedDefaultCurrency) {
    return `${base} No dedicated currency column — codes in price cells are used when present, otherwise ${IMPORT_DEFAULT_CURRENCY}.`;
  }
  return `${base} No dedicated currency column — currency was read from price cell values.`;
}

function logParseMeta(
  userId: string,
  meta: BrokerParseMeta,
  tradeCount: number,
  skippedCount: number
): void {
  // GDPR: never log cell values, filenames, or statement contents — metadata only.
  console.info('[BrokerImport] parse complete', {
    userId,
    mode: meta.mode,
    confidence: meta.confidence,
    headerFingerprint: meta.headerFingerprint,
    tradeCount,
    skippedCount,
    hasWarning: Boolean(meta.warning),
  });
}

/**
 * Universal broker import (no per-broker selection):
 * 1) heuristic column mapping → local parse
 * 2) Gemini schema-from-sample only → local parse of all rows
 */
export async function parseBrokerStatement(
  sheetData: SafeSheetData,
  userId: string
): Promise<BrokerParseResult> {
  const heuristic = mapColumnsHeuristically(sheetData);
  if (heuristic) {
    const parsed = parseRowsWithMapping(sheetData, heuristic.mapping);
    const meta: BrokerParseMeta = {
      mode: 'heuristic',
      confidence: heuristic.confidence,
      columnMapping: heuristic.mapping,
      headerFingerprint: heuristic.headerFingerprint,
      warning: buildHeuristicWarning(heuristic.missingCurrency, parsed.usedDefaultCurrency),
    };
    logParseMeta(userId, meta, parsed.trades.length, parsed.skipped.length);
    return { trades: parsed.trades, skipped: parsed.skipped, meta };
  }

  if (!isGeminiConfigured) {
    throw new AppError(
      400,
      'Could not detect statement columns. Upload a trade history table with Date, Ticker, Buy/Sell, Quantity, and Price columns (Currency optional), or enable AI schema assist.'
    );
  }

  await assertAiQuotaAvailable(userId, 'import_schema');

  const sample = buildGdprSafeSchemaSample(sheetData);
  console.info('[BrokerImport] requesting AI schema from truncated sample', {
    userId,
    sampleRowCount: sample.sampleRows.length,
    columnCount: sample.columnCount,
  });

  let aiMapping;
  try {
    aiMapping = await inferImportSchemaWithGemini(sample);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('[BrokerImport] AI schema inference failed:', error);
    throw new AppError(
      502,
      'AI schema assist failed. Try a CSV/XLSX trade export with clear column headers.'
    );
  }

  await recordAiUsage(userId, 'import_schema');

  const parsed = parseRowsWithMapping(sheetData, aiMapping.mapping);
  const missingCurrency = aiMapping.mapping.columns.currency === null;
  const meta: BrokerParseMeta = {
    mode: 'ai_schema',
    confidence: aiMapping.confidence,
    columnMapping: aiMapping.mapping,
    headerFingerprint: null,
    warning: buildAiWarning(missingCurrency, parsed.usedDefaultCurrency),
  };
  logParseMeta(userId, meta, parsed.trades.length, parsed.skipped.length);
  return { trades: parsed.trades, skipped: parsed.skipped, meta };
}
