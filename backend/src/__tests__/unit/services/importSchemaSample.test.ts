import { buildGdprSafeSchemaSample } from '../../../services/brokerParsers/importSchemaSample.js';
import {
  IMPORT_AI_SCHEMA_MAX_CELL_CHARS,
  IMPORT_AI_SCHEMA_SAMPLE_ROWS,
} from '../../../constants.js';
import type { SafeSheetData } from '../../../utils/excelSafeReader.js';

describe('buildGdprSafeSchemaSample', () => {
  it('truncates rows and cell length for GDPR-safe AI input', () => {
    const longCell = 'A'.repeat(IMPORT_AI_SCHEMA_MAX_CELL_CHARS + 40);
    const rows = Array.from({ length: IMPORT_AI_SCHEMA_SAMPLE_ROWS + 30 }, (_, index) => [
      `row-${index}`,
      longCell,
    ]);

    const sample = buildGdprSafeSchemaSample({ sheetName: 'Sheet1', rows } as SafeSheetData);

    expect(sample.sampleRows).toHaveLength(IMPORT_AI_SCHEMA_SAMPLE_ROWS);
    expect(sample.sampleRows[0][1].length).toBe(IMPORT_AI_SCHEMA_MAX_CELL_CHARS);
    expect(sample.columnCount).toBe(2);
  });
});
