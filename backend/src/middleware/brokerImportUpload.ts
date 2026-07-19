import multer from 'multer';
import { IMPORT_MAX_FILE_SIZE_BYTES } from '../constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: IMPORT_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    const normalizedName = file.originalname.toLowerCase();
    const isXlsx =
      normalizedName.endsWith('.xlsx') &&
      (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/octet-stream');

    if (!isXlsx) {
      callback(new Error('Only .xlsx broker statements are supported'));
      return;
    }

    callback(null, true);
  },
});

export const brokerImportUploadMiddleware = upload.single('file');
