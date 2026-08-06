export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
}

export interface StepUpCredentials {
  password?: string;
  googleIdToken?: string;
}

export interface ChangePasswordPayload extends StepUpCredentials {
  newPassword: string;
  /** @deprecated Prefer `password` — kept for older callers */
  currentPassword?: string;
}

export interface DeleteAccountPayload extends StepUpCredentials {
  confirm: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface RegisterPendingResult {
  email: string;
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  pendingVerificationEmail: string | null;
  infoMessage: string | null;
}
