import { IMPORT_AI_SCHEMA_MAX_CELL_CHARS, IMPORT_AI_SCHEMA_SAMPLE_ROWS } from '../../constants.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';
import { sanitizeText } from './parseUtils.js';

/**
 * GDPR-safe sample for Gemini schema inference:
 * - only a small window of rows from the start of the sheet (not the full statement)
 * - cell values truncated
 * Never log or persist this sample beyond the in-flight AI request.
 */
export function buildGdprSafeSchemaSample(sheetData: SafeSheetData): {
  sampleRows: string[][];
  columnCount: number;
} {
  const rawSample = sheetData.rows.slice(0, IMPORT_AI_SCHEMA_SAMPLE_ROWS);
  const columnCount = Math.max(...rawSample.map((row) => row.length), 0);

  const sampleRows = rawSample.map((row) =>
    Array.from({ length: columnCount }, (_, columnIndex) =>
      sanitizeText(row[columnIndex], IMPORT_AI_SCHEMA_MAX_CELL_CHARS)
    )
  );

  return {
    sampleRows,
    columnCount,
  };
}
