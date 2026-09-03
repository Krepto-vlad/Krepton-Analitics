import multer from 'multer';
import { IMPORT_MAX_FILE_SIZE_BYTES } from '../constants.js';

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
  'application/vnd.ms-excel',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: IMPORT_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    const normalizedName = file.originalname.toLowerCase();

    if (normalizedName.endsWith('.pdf')) {
      callback(new Error('PDF statements are not supported. Upload .xlsx or .csv.'));
      return;
    }

    const isXlsx = normalizedName.endsWith('.xlsx') && XLSX_MIME_TYPES.has(file.mimetype);
    const isCsv = normalizedName.endsWith('.csv') && CSV_MIME_TYPES.has(file.mimetype);

    if (!isXlsx && !isCsv) {
      callback(new Error('Only .xlsx and .csv broker statements are supported'));
      return;
    }

    callback(null, true);
  },
});

export const brokerImportUploadMiddleware = upload.single('file');
