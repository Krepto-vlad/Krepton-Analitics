import type { Request, Response, NextFunction } from 'express';
import { isPaidUser } from '../services/entitlementService.js';
import { SNAPTRADE_PLUS_REQUIRED_MESSAGE } from '../constants.js';
import { AppError } from './errorHandler.js';

export async function paidMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const isPaid = await isPaidUser(userId);
    if (!isPaid) {
      throw new AppError(403, SNAPTRADE_PLUS_REQUIRED_MESSAGE);
    }

    next();
  } catch (error) {
    next(error);
  }
}
