import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  createGoogleUser,
  createPasswordUser,
  deleteUserById,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserByPasswordResetTokenHash,
  findUserByVerificationTokenHash,
  linkGoogleSubToUser,
  markEmailVerified,
  setEmailVerificationToken,
  setPasswordResetToken,
  updateUserPasswordHash,
} from '../repositories/userRepository.js';
import {
  deletePortfolioAccountById,
  findPortfolioAccountIdByOwnerToken,
} from '../repositories/portfolioRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  ACCOUNT_DELETE_CONFIRMATION,
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TTL_MS,
  JWT_SLIDING_RENEW_REMAINING_MS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_REQUEST_GENERIC_MESSAGE,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TTL_MS,
} from '../constants.js';
import type {
  AuthUser,
  AuthUserProfile,
  SessionExtensionResult,
  RegisterPendingResult,
  StepUpCredentials,
  TokenPayload,
  UserRow,
} from '../types/auth.types.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import {
  sendEmailVerificationLink,
  sendGoogleOnlySignInHint,
  sendPasswordResetLink,
} from './emailService.js';
import { verifyGoogleIdToken } from './googleAuthService.js';
import { isAdminEmail } from '../config/env.js';
import { getSubscriptionSummaryForUser } from './entitlementService.js';
import { cancelPaddleSubscriptionForUser } from './billingCheckoutService.js';

async function mapUserRowToAuthUser(user: UserRow): Promise<AuthUserProfile> {
  const subscription = await getSubscriptionSummaryForUser(user.id);

  return {
    id: user.id,
    email: user.email,
    createdAt: new Date(user.created_at).toISOString(),
    emailVerified: user.email_verified,
    hasPassword: Boolean(user.password_hash),
    hasGoogle: Boolean(user.google_sub),
    isAdmin: isAdminEmail(user.email),
    subscription,
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

function createPasswordResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

async function issueVerificationEmail(user: UserRow, rawToken: string): Promise<void> {
  try {
    await sendEmailVerificationLink(user.email, rawToken);
  } catch (error) {
    logger.error({ err: error, userId: user.id }, 'Failed to send verification email');
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
    message:
      'We sent a verification link to your email. Confirm it before signing in. If it is missing, check Spam / Junk.',
  };
}

export async function resendVerificationEmail(email: string): Promise<RegisterPendingResult> {
  const user = await findUserByEmail(email);

  // Avoid account enumeration: always return the same success shape.
  if (!user || user.email_verified || !user.password_hash) {
    return {
      email,
      message:
        'If an unverified account exists for this email, a new verification link has been sent.',
    };
  }

  const verification = createVerificationToken();
  await setEmailVerificationToken(user.id, verification.tokenHash, verification.expiresAt);
  await issueVerificationEmail(user, verification.token);

  return {
    email: user.email,
    message:
      'If an unverified account exists for this email, a new verification link has been sent.',
  };
}

export async function verifyEmailWithToken(rawToken: unknown): Promise<AuthUserProfile> {
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

  return await mapUserRowToAuthUser(verifiedUser);
}

export async function loginUser(email: string, password: string): Promise<AuthUserProfile> {
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

  return await mapUserRowToAuthUser(user);
}

export async function loginWithGoogleIdToken(idToken: unknown): Promise<AuthUserProfile> {
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

  return await mapUserRowToAuthUser(user);
}

export async function getUserById(userId: string): Promise<AuthUserProfile> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'User not found');
  }
  return await mapUserRowToAuthUser(user);
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

/**
 * Always returns a generic message (anti-enumeration).
 * Sends reset link for verified password users; Google-only get a sign-in hint email.
 */
export async function requestPasswordReset(email: unknown): Promise<{ message: string }> {
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw new AppError(400, 'Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  try {
    if (user?.email_verified && user.password_hash) {
      const resetToken = createPasswordResetToken();
      await setPasswordResetToken(user.id, resetToken.tokenHash, resetToken.expiresAt);
      await sendPasswordResetLink(user.email, resetToken.token);
      logger.info({ userId: user.id }, 'Password reset email issued');
    } else if (user?.google_sub && !user.password_hash) {
      await sendGoogleOnlySignInHint(user.email);
      logger.info({ userId: user.id }, 'Google-only sign-in hint issued');
    }
  } catch (error) {
    // Do not leak whether the account exists via SMTP/config failures.
    logger.error({ err: error }, 'Password reset request side-effect failed');
  }

  return { message: PASSWORD_RESET_REQUEST_GENERIC_MESSAGE };
}

export async function resetPasswordWithToken(
  token: unknown,
  newPassword: unknown
): Promise<{ message: string }> {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new AppError(400, 'Reset token is required');
  }

  if (typeof newPassword !== 'string' || newPassword.length === 0) {
    throw new AppError(400, 'New password is required');
  }

  assertPasswordStrength(newPassword);

  const tokenHash = hashVerificationToken(token.trim());
  const user = await findUserByPasswordResetTokenHash(tokenHash);
  if (!user || !user.password_hash) {
    throw new AppError(400, 'Reset link is invalid or expired. Request a new password reset.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  const updated = await updateUserPasswordHash(user.id, passwordHash);
  if (!updated) {
    throw new AppError(500, 'Unable to update password');
  }

  logger.info({ userId: user.id }, 'Password reset completed');
  return { message: 'Password updated successfully. You can sign in with your new password.' };
}

/**
 * Hard-deletes the user account and linked anonymous portfolio (GDPR erasure).
 * Requires step-up (password or Google) plus typed confirmation phrase.
 * AI rows cascade via FK; portfolio is deleted via HMAC owner_token lookup.
 */
export async function deleteUserAccount(
  userId: string,
  confirm: unknown,
  credentials: StepUpCredentials
): Promise<void> {
  if (confirm !== ACCOUNT_DELETE_CONFIRMATION) {
    throw new AppError(
      400,
      `Confirmation required. Send { "confirm": "${ACCOUNT_DELETE_CONFIRMATION}" }.`
    );
  }

  await verifySensitiveAction(userId, credentials);
  await cancelPaddleSubscriptionForUser(userId);

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findPortfolioAccountIdByOwnerToken(ownerToken);
  if (portfolioId) {
    await deletePortfolioAccountById(portfolioId);
  }

  const deleted = await deleteUserById(userId);
  if (!deleted) {
    throw new AppError(404, 'Account not found');
  }

  // GDPR: never log email or statement content — metadata only.
  logger.info({ userId, hadPortfolio: Boolean(portfolioId) }, 'Account deleted');
}

export function signAccessToken(userId: string): string {
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function readAccessTokenExpiresAt(token: string): string {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new AppError(500, 'Access token is missing an expiry');
  }

  return new Date(decoded.exp * 1000).toISOString();
}

export function withSessionExpiry(user: AuthUserProfile, token: string): AuthUser {
  return {
    ...user,
    sessionExpiresAt: readAccessTokenExpiresAt(token),
  };
}

export function getAccessTokenRemainingMs(token: string): number {
  return Date.parse(readAccessTokenExpiresAt(token)) - Date.now();
}

export function shouldRenewAccessToken(token: string): boolean {
  const remainingMs = getAccessTokenRemainingMs(token);
  return Number.isFinite(remainingMs) && remainingMs <= JWT_SLIDING_RENEW_REMAINING_MS;
}

export function extendAccessSession(userId: string, currentToken: string): SessionExtensionResult {
  if (!shouldRenewAccessToken(currentToken)) {
    return {
      token: currentToken,
      sessionExpiresAt: readAccessTokenExpiresAt(currentToken),
      renewed: false,
    };
  }

  const token = signAccessToken(userId);
  return {
    token,
    sessionExpiresAt: readAccessTokenExpiresAt(token),
    renewed: true,
  };
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}
