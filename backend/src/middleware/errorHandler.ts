import type { Request, Response, NextFunction } from 'express';
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

  res.status(500).json({ success: false, error: 'Internal server error' });
}
