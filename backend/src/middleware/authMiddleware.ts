import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService.js';
import { AppError } from './errorHandler.js';
import { JWT_COOKIE_NAME } from '../constants.js';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[JWT_COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new AppError(401, 'Unauthorized');
    }

    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.accessToken = token;

    next();
  } catch (error) {
    next(error);
  }
}
