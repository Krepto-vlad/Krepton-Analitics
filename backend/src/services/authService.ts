import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserByEmail, findUserById, createUser } from '../repositories/userRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { BCRYPT_SALT_ROUNDS } from '../constants.js';
import type { AuthUser, TokenPayload } from '../types/auth.types.js';

export async function registerUser(email: string, password: string): Promise<AuthUser> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await createUser(email, passwordHash);

  return { id: user.id, email: user.email };
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

  return { id: user.id, email: user.email };
}

export async function getUserById(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'User not found');
  }
  return { id: user.id, email: user.email };
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
