import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  createGoogleUser,
  createPasswordUser,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserByVerificationTokenHash,
  linkGoogleSubToUser,
  markEmailVerified,
  setEmailVerificationToken,
  updateUserPasswordHash,
} from '../repositories/userRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_MIN_LENGTH,
} from '../constants.js';
import type {
  AuthUser,
  RegisterPendingResult,
  StepUpCredentials,
  TokenPayload,
  UserRow,
} from '../types/auth.types.js';
import { sendEmailVerificationLink } from './emailService.js';
import { verifyGoogleIdToken } from './googleAuthService.js';

function mapUserRowToAuthUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: new Date(user.created_at).toISOString(),
    emailVerified: user.email_verified,
    hasPassword: Boolean(user.password_hash),
    hasGoogle: Boolean(user.google_sub),
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

function hashVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createVerificationToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

async function issueVerificationEmail(user: UserRow, rawToken: string): Promise<void> {
  try {
    await sendEmailVerificationLink(user.email, rawToken);
  } catch (error) {
    console.error('[Auth] Failed to send verification email', error);
    throw new AppError(500, 'Unable to send verification email. Please try again later.');
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<RegisterPendingResult> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    if (existingUser.google_sub && !existingUser.password_hash) {
      throw new AppError(
        409,
        'This email already uses Google sign-in. Sign in with Google, then set a password in Profile if needed.'
      );
    }
    throw new AppError(409, 'Email already registered');
  }

  assertPasswordStrength(password);

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const verification = createVerificationToken();
  const user = await createPasswordUser(
    email,
    passwordHash,
    verification.tokenHash,
    verification.expiresAt
  );

  await issueVerificationEmail(user, verification.token);

  return {
    email: user.email,
    message: 'Check your email to verify your account before signing in.',
  };
}

export async function resendVerificationEmail(email: string): Promise<RegisterPendingResult> {
  const user = await findUserByEmail(email);

  // Avoid account enumeration: always return the same success shape.
  if (!user || user.email_verified || !user.password_hash) {
    return {
      email,
      message: 'If an unverified account exists for this email, a new verification link was sent.',
    };
  }

  const verification = createVerificationToken();
  await setEmailVerificationToken(user.id, verification.tokenHash, verification.expiresAt);
  await issueVerificationEmail(user, verification.token);

  return {
    email: user.email,
    message: 'If an unverified account exists for this email, a new verification link was sent.',
  };
}

export async function verifyEmailWithToken(rawToken: unknown): Promise<AuthUser> {
  if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    throw new AppError(400, 'Verification token is required');
  }

  const user = await findUserByVerificationTokenHash(hashVerificationToken(rawToken.trim()));
  if (!user) {
    throw new AppError(400, 'Verification link is invalid or has expired');
  }

  await markEmailVerified(user.id);
  const verifiedUser = await findUserById(user.id);
  if (!verifiedUser) {
    throw new AppError(500, 'Unable to verify email');
  }

  return mapUserRowToAuthUser(verifiedUser);
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.email_verified) {
    throw new AppError(403, 'Please verify your email before signing in.');
  }

  return mapUserRowToAuthUser(user);
}

export async function loginWithGoogleIdToken(idToken: unknown): Promise<AuthUser> {
  const googleIdentity = await verifyGoogleIdToken(idToken);

  let user = await findUserByGoogleSub(googleIdentity.googleSub);

  if (!user) {
    const existingByEmail = await findUserByEmail(googleIdentity.email);
    if (existingByEmail) {
      if (existingByEmail.google_sub && existingByEmail.google_sub !== googleIdentity.googleSub) {
        throw new AppError(409, 'This email is already linked to a different Google account');
      }

      await linkGoogleSubToUser(existingByEmail.id, googleIdentity.googleSub);
      user = await findUserById(existingByEmail.id);
    } else {
      user = await createGoogleUser(googleIdentity.email, googleIdentity.googleSub);
    }
  }

  if (!user) {
    throw new AppError(500, 'Unable to complete Google sign-in');
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
  if (!user || !user.password_hash) {
    throw new AppError(401, 'Unauthorized');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError(401, invalidPasswordMessage);
  }
}

export async function verifySensitiveAction(
  userId: string,
  credentials: StepUpCredentials
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'Unauthorized');
  }

  const hasPasswordProof =
    typeof credentials.password === 'string' && credentials.password.length > 0;
  const hasGoogleProof =
    typeof credentials.googleIdToken === 'string' && credentials.googleIdToken.length > 0;

  if (hasPasswordProof === hasGoogleProof) {
    throw new AppError(400, 'Provide either password or googleIdToken for confirmation');
  }

  if (hasPasswordProof) {
    if (!user.password_hash) {
      throw new AppError(400, 'This account has no password. Confirm with Google instead.');
    }
    await verifyUserPassword(userId, credentials.password, 'Invalid password');
    return;
  }

  if (!user.google_sub) {
    throw new AppError(400, 'This account is not linked to Google. Confirm with password instead.');
  }

  const googleIdentity = await verifyGoogleIdToken(credentials.googleIdToken);
  if (googleIdentity.googleSub !== user.google_sub) {
    throw new AppError(401, 'Google confirmation does not match this account');
  }
}

export async function changeUserPassword(
  userId: string,
  newPassword: string,
  credentials: StepUpCredentials
): Promise<void> {
  if (!newPassword) {
    throw new AppError(400, 'New password is required');
  }

  assertPasswordStrength(newPassword);

  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'Unauthorized');
  }

  const stepUpPassword =
    typeof credentials.password === 'string' && credentials.password.length > 0
      ? credentials.password
      : undefined;

  if (user.password_hash && stepUpPassword && stepUpPassword === newPassword) {
    throw new AppError(400, 'New password must be different from the current password');
  }

  await verifySensitiveAction(userId, credentials);

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
