import type { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserById,
  changeUserPassword,
  signAccessToken,
} from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';
import { JWT_COOKIE_NAME, JWT_COOKIE_MAX_AGE_MS } from '../constants.js';
import type {
  AuthResponse,
  RegisterBody,
  LoginBody,
  ChangePasswordBody,
} from '../types/auth.types.js';
import type { ApiResponse } from '../types/stock.types.js';

function setAuthCookie(res: Response, token: string): void {
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: JWT_COOKIE_MAX_AGE_MS,
  });
}

export async function register(
  req: Request<object, AuthResponse, RegisterBody>,
  res: Response<AuthResponse>
): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'Invalid input types');
  }

  const user = await registerUser(email.trim().toLowerCase(), password);
  const token = signAccessToken(user.id);

  setAuthCookie(res, token);
  res.status(201).json({ success: true, data: user });
}

export async function login(
  req: Request<object, AuthResponse, LoginBody>,
  res: Response<AuthResponse>
): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'Invalid input types');
  }

  const user = await loginUser(email.trim().toLowerCase(), password);
  const token = signAccessToken(user.id);

  setAuthCookie(res, token);
  res.json({ success: true, data: user });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(JWT_COOKIE_NAME);
  res.json({ success: true, data: null });
}

export async function getMe(req: Request, res: Response<AuthResponse>): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const user = await getUserById(userId);
  res.json({ success: true, data: user });
}

export async function changePassword(
  req: Request<object, ApiResponse<{ message: string }>, ChangePasswordBody>,
  res: Response<ApiResponse<{ message: string }>>
): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw new AppError(400, 'Invalid input types');
  }

  await changeUserPassword(userId, currentPassword, newPassword);
  res.json({ success: true, data: { message: 'Password updated successfully' } });
}
