import * as XLSX from 'xlsx';
import { AppError } from '../middleware/errorHandler.js';
import {
  IMPORT_MAX_FILE_SIZE_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_MAX_COLUMNS,
  IMPORT_MAX_SHEETS,
} from '../constants.js';

const XLSX_ZIP_MAGIC_BYTE_0 = 0x50; // P
const XLSX_ZIP_MAGIC_BYTE_1 = 0x4b; // K
const MACRO_INDICATOR = 'vbaProject.bin';

const SAFE_READ_OPTIONS: XLSX.ParsingOptions = {
  type: 'buffer',
  cellFormula: false,
  cellHTML: false,
  cellStyles: false,
  bookVBA: false,
  dense: true,
};

export interface SafeSheetData {
  sheetName: string;
  rows: unknown[][];
}

function assertValidXlsxBuffer(buffer: Buffer): void {
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError(400, 'Invalid file payload');
  }

  if (buffer.length === 0) {
    throw new AppError(400, 'Uploaded file is empty');
  }

  if (buffer.length > IMPORT_MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      400,
      `File exceeds maximum size of ${IMPORT_MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
    );
  }

  if (buffer[0] !== XLSX_ZIP_MAGIC_BYTE_0 || buffer[1] !== XLSX_ZIP_MAGIC_BYTE_1) {
    throw new AppError(400, 'Only valid .xlsx workbooks are supported');
  }

  if (buffer.includes(MACRO_INDICATOR)) {
    throw new AppError(400, 'Macro-enabled Excel files are not supported');
  }
}

function normalizeRows(rawRows: unknown[][]): unknown[][] {
  return rawRows
    .filter((row) => row.some((cell) => String(cell ?? '').trim().length > 0))
    .slice(0, IMPORT_MAX_ROWS)
    .map((row) => row.slice(0, IMPORT_MAX_COLUMNS));
}

/**
 * Reads an .xlsx workbook from memory with strict safety limits.
 * Formulas, macros, HTML, and VBA content are never evaluated.
 */
export function readSafeXlsxBuffer(buffer: Buffer): SafeSheetData {
  assertValidXlsxBuffer(buffer);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, SAFE_READ_OPTIONS);
  } catch {
    throw new AppError(400, 'Unable to parse Excel file. Upload a valid .xlsx statement.');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new AppError(400, 'Excel file does not contain any worksheets');
  }

  if (workbook.SheetNames.length > IMPORT_MAX_SHEETS) {
    throw new AppError(400, 'Excel file contains too many worksheets');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new AppError(400, 'Excel worksheet is empty');
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][];

  const rows = normalizeRows(rawRows);

  if (rows.length === 0) {
    throw new AppError(400, 'Excel worksheet does not contain any rows');
  }

  return { sheetName, rows };
}
