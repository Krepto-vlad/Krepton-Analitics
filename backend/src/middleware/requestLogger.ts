import type { Request, Response, NextFunction } from 'express';
import { HEALTH_CHECK_PATH, LOG_EVENT } from '../constants.js';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAtMs = Date.now();

  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0] ?? req.path;
    const payload = {
      event: LOG_EVENT.HTTP_REQUEST,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Date.now() - startedAtMs,
    };

    if (path === HEALTH_CHECK_PATH) {
      logger.debug(payload, 'HTTP request');
      return;
    }

    logger.info(payload, 'HTTP request');
  });

  next();
}
