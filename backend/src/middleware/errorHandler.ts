import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { ApiErrorResponse } from '../types/stock.types.js';

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
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void {
  console.error('[ErrorHandler]', error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ success: false, error: 'File exceeds the maximum upload size' });
      return;
    }

    res.status(400).json({ success: false, error: error.message });
    return;
  }

  if (error.message.includes('.xlsx')) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }

  res.status(500).json({ success: false, error: 'Internal server error' });
}
