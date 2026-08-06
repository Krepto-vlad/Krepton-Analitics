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

function assertFileSize(buffer: Buffer): void {
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
}

function assertValidXlsxBuffer(buffer: Buffer): void {
  assertFileSize(buffer);

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

function resolveExtension(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }
  return normalized.slice(dotIndex);
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

/**
 * Reads a CSV statement from memory. No disk writes. PDF and other formats rejected upstream.
 */
export function readSafeCsvBuffer(buffer: Buffer): SafeSheetData {
  assertFileSize(buffer);

  let workbook: XLSX.WorkBook;
  try {
    const csvText = buffer.toString('utf8');
    workbook = XLSX.read(csvText, {
      type: 'string',
      raw: false,
      cellFormula: false,
      cellHTML: false,
      dense: true,
    });
  } catch {
    throw new AppError(400, 'Unable to parse CSV file. Upload a valid .csv trade export.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new AppError(400, 'CSV file is empty');
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  const rows = normalizeRows(rawRows);

  if (rows.length === 0) {
    throw new AppError(400, 'CSV file does not contain any rows');
  }

  return { sheetName: sheetName || 'CSV', rows };
}

/**
 * Unified tabular reader for broker statements (.xlsx / .csv only).
 */
export function readSafeTabularBuffer(buffer: Buffer, filename: string): SafeSheetData {
  const extension = resolveExtension(filename);

  if (extension === '.xlsx') {
    return readSafeXlsxBuffer(buffer);
  }

  if (extension === '.csv') {
    return readSafeCsvBuffer(buffer);
  }

  if (extension === '.pdf') {
    throw new AppError(400, 'PDF statements are not supported. Upload .xlsx or .csv.');
  }

  throw new AppError(400, 'Only .xlsx and .csv broker statements are supported');
}
