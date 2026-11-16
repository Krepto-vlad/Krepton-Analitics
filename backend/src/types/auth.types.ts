import type { SubscriptionSummary } from './billing.types.js';
import type { ApiResponse } from './stock.types.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  email_verified: boolean;
  email_verification_token_hash: string | null;
  email_verification_expires_at: Date | null;
  password_reset_token_hash: string | null;
  password_reset_expires_at: Date | null;
  ai_personal_data_enabled: boolean;
  created_at: Date;
}

export interface TokenPayload {
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  /** ISO timestamp of the HttpOnly JWT `exp` — not stored in the anonymous DB. */
  sessionExpiresAt: string;
  isAdmin: boolean;
  /** When false, AI chat receives public market data only. */
  aiPersonalDataEnabled: boolean;
  subscription: SubscriptionSummary;
}

export type AuthUserProfile = Omit<AuthUser, 'sessionExpiresAt'>;

export interface SessionExtension {
  sessionExpiresAt: string;
  renewed: boolean;
}

export interface SessionExtensionResult extends SessionExtension {
  token: string;
}

export interface RegisterBody {
  email: string;
  password: string;
}

export interface RegisterPendingResult {
  email: string;
  message: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface GoogleLoginBody {
  idToken: string;
}

export interface VerifyEmailBody {
  token: string;
}

export interface ResendVerificationBody {
  email: string;
}

export interface StepUpCredentials {
  password?: string;
  googleIdToken?: string;
}

export interface ChangePasswordBody extends StepUpCredentials {
  currentPassword?: string;
  newPassword: string;
}

export interface DeleteAccountBody extends StepUpCredentials {
  confirm: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

export type AuthResponse = ApiResponse<AuthUser>;
export type RegisterPendingResponse = ApiResponse<RegisterPendingResult>;
export type SessionExtensionResponse = ApiResponse<SessionExtension>;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    requestId?: string;
    accessToken?: string;
  }
}
