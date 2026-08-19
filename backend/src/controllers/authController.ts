import type { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  loginWithGoogleIdToken,
  getUserById,
  changeUserPassword,
  deleteUserAccount,
  requestPasswordReset,
  resetPasswordWithToken,
  signAccessToken,
  verifyEmailWithToken,
  resendVerificationEmail,
} from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { HTTPS_ORIGIN_PREFIX, JWT_COOKIE_NAME, JWT_COOKIE_MAX_AGE_MS } from '../constants.js';
import type {
  AuthResponse,
  RegisterBody,
  RegisterPendingResponse,
  LoginBody,
  GoogleLoginBody,
  VerifyEmailBody,
  ResendVerificationBody,
  ChangePasswordBody,
  DeleteAccountBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from '../types/auth.types.js';
import type { ApiResponse } from '../types/stock.types.js';

function getAuthCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: env.frontendUrl.startsWith(HTTPS_ORIGIN_PREFIX),
    sameSite: 'strict',
    maxAge: JWT_COOKIE_MAX_AGE_MS,
  };
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(JWT_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: env.frontendUrl.startsWith(HTTPS_ORIGIN_PREFIX),
    sameSite: 'strict',
  });
}

export async function register(
  req: Request<object, RegisterPendingResponse, RegisterBody>,
  res: Response<RegisterPendingResponse>
): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'Invalid input types');
  }

  const result = await registerUser(email.trim().toLowerCase(), password);
  res.status(201).json({ success: true, data: result });
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

export async function googleLogin(
  req: Request<object, AuthResponse, GoogleLoginBody>,
  res: Response<AuthResponse>
): Promise<void> {
  const user = await loginWithGoogleIdToken(req.body?.idToken);
  const token = signAccessToken(user.id);

  setAuthCookie(res, token);
  res.json({ success: true, data: user });
}

export async function verifyEmail(
  req: Request<object, AuthResponse, VerifyEmailBody>,
  res: Response<AuthResponse>
): Promise<void> {
  const user = await verifyEmailWithToken(req.body?.token);
  const token = signAccessToken(user.id);

  setAuthCookie(res, token);
  res.json({ success: true, data: user });
}

export async function resendVerification(
  req: Request<object, RegisterPendingResponse, ResendVerificationBody>,
  res: Response<RegisterPendingResponse>
): Promise<void> {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    throw new AppError(400, 'Email is required');
  }

  const result = await resendVerificationEmail(email.trim().toLowerCase());
  res.json({ success: true, data: result });
}

export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
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

  const { newPassword, currentPassword, password, googleIdToken } = req.body;

  if (typeof newPassword !== 'string') {
    throw new AppError(400, 'Invalid input types');
  }

  const stepUpPassword =
    typeof password === 'string'
      ? password
      : typeof currentPassword === 'string'
        ? currentPassword
        : undefined;

  await changeUserPassword(userId, newPassword, {
    password: stepUpPassword,
    googleIdToken,
  });
  res.json({ success: true, data: { message: 'Password updated successfully' } });
}

export async function deleteAccount(
  req: Request<object, ApiResponse<{ message: string }>, DeleteAccountBody>,
  res: Response<ApiResponse<{ message: string }>>
): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const { confirm, password, googleIdToken } = req.body ?? {};

  await deleteUserAccount(userId, confirm, { password, googleIdToken });
  clearAuthCookie(res);
  res.json({
    success: true,
    data: { message: 'Account deleted successfully' },
  });
}

export async function forgotPassword(
  req: Request<object, ApiResponse<{ message: string }>, ForgotPasswordBody>,
  res: Response<ApiResponse<{ message: string }>>
): Promise<void> {
  const result = await requestPasswordReset(req.body?.email);
  res.json({ success: true, data: result });
}

export async function resetPassword(
  req: Request<object, ApiResponse<{ message: string }>, ResetPasswordBody>,
  res: Response<ApiResponse<{ message: string }>>
): Promise<void> {
  const result = await resetPasswordWithToken(req.body?.token, req.body?.newPassword);
  res.json({ success: true, data: result });
}
