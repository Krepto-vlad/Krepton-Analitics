import type { ApiResponse } from './stock.types.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  email_verified: boolean;
  email_verification_token_hash: string | null;
  email_verification_expires_at: Date | null;
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

export type AuthResponse = ApiResponse<AuthUser>;
export type RegisterPendingResponse = ApiResponse<RegisterPendingResult>;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}
