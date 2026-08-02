import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPasswordHash,
} from '../repositories/userRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { BCRYPT_SALT_ROUNDS, PASSWORD_MIN_LENGTH } from '../constants.js';
import type { AuthUser, TokenPayload } from '../types/auth.types.js';

function mapUserRowToAuthUser(user: { id: string; email: string; created_at: Date }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: new Date(user.created_at).toISOString(),
  };
}

function assertPasswordStrength(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    throw new AppError(400, 'Password must include at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw new AppError(400, 'Password must include at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new AppError(400, 'Password must include at least one special character');
  }
}

export async function registerUser(email: string, password: string): Promise<AuthUser> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError(409, 'Email already registered');
  }

  assertPasswordStrength(password);

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await createUser(email, passwordHash);

  return mapUserRowToAuthUser(user);
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password');
  }

  return mapUserRowToAuthUser(user);
}

export async function getUserById(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'User not found');
  }
  return mapUserRowToAuthUser(user);
}

/**
 * Step-up authentication for sensitive actions (export, password change).
 */
export async function verifyUserPassword(
  userId: string,
  password: unknown,
  invalidPasswordMessage = 'Invalid password'
): Promise<void> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new AppError(400, 'Password is required');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'Unauthorized');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError(401, invalidPasswordMessage);
  }
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!currentPassword || !newPassword) {
    throw new AppError(400, 'Current password and new password are required');
  }

  if (currentPassword === newPassword) {
    throw new AppError(400, 'New password must be different from the current password');
  }

  assertPasswordStrength(newPassword);

  await verifyUserPassword(userId, currentPassword, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  const updated = await updateUserPasswordHash(userId, passwordHash);
  if (!updated) {
    throw new AppError(500, 'Unable to update password');
  }
}

export function signAccessToken(userId: string): string {
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}
