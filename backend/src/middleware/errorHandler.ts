import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { ApiErrorResponse } from '../types/stock.types.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENT } from '../constants.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    logger.warn(
      {
        event: LOG_EVENT.APP_ERROR,
        statusCode: error.statusCode,
        path: req.originalUrl,
        method: req.method,
        err: error,
      },
      error.message
    );
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    logger.warn(
      {
        event: LOG_EVENT.APP_ERROR,
        statusCode: 400,
        multerCode: error.code,
        path: req.originalUrl,
        err: error,
      },
      'Upload rejected'
    );

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, error: 'File exceeds the maximum upload size' });
      return;
    }

    res.status(400).json({ success: false, error: error.message });
    return;
  }

  if (error.message.includes('.xlsx')) {
    logger.warn(
      {
        event: LOG_EVENT.APP_ERROR,
        statusCode: 400,
        path: req.originalUrl,
        err: error,
      },
      error.message
    );
    res.status(400).json({ success: false, error: error.message });
    return;
  }

  logger.error(
    {
      event: LOG_EVENT.UNHANDLED_ERROR,
      path: req.originalUrl,
      method: req.method,
      err: error,
    },
    'Unhandled error'
  );
  res.status(500).json({ success: false, error: 'Internal server error' });
}
