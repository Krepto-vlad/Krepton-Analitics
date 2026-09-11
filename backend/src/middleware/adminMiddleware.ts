import type { Request, Response, NextFunction } from 'express';
import { findUserById } from '../repositories/userRepository.js';
import { isAdminEmail } from '../config/env.js';
import { AppError } from './errorHandler.js';

export async function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await findUserById(userId);
    if (!user || !isAdminEmail(user.email)) {
      throw new AppError(403, 'Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
