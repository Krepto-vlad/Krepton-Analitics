import type { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/env.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!isDevelopment) {
    next();
    return;
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${duration}ms)`);
  });

  next();
}
