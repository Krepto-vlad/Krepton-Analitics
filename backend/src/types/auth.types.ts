import type { ApiResponse } from './stock.types.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface TokenPayload {
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface RegisterBody {
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export type AuthResponse = ApiResponse<AuthUser>;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}
