import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type {
  AuthUser,
  ChangePasswordPayload,
  DeleteAccountPayload,
  LoginCredentials,
  RegisterCredentials,
  RegisterPendingResult,
  SessionExtension,
} from '../types/auth.types';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import { normalizeAuthUser } from '../utils/normalizeAuthUser';

const authClient = createApiClient(`${API_BASE_URL}/api/auth`);

export async function apiRegister(
  credentials: RegisterCredentials
): Promise<RegisterPendingResult> {
  const { data } = await authClient.post<
    ApiSuccessResponse<RegisterPendingResult> | ApiErrorResponse
  >('/register', credentials);
  return assertSuccess(data);
}

export async function apiLogin(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/login',
    credentials
  );
  return normalizeAuthUser(assertSuccess(data));
}

export async function apiGoogleLogin(idToken: string): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/google',
    { idToken }
  );
  return normalizeAuthUser(assertSuccess(data));
}

export async function apiVerifyEmail(token: string): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/verify-email',
    { token }
  );
  return normalizeAuthUser(assertSuccess(data));
}

export async function apiResendVerification(email: string): Promise<RegisterPendingResult> {
  const { data } = await authClient.post<
    ApiSuccessResponse<RegisterPendingResult> | ApiErrorResponse
  >('/resend-verification', { email });
  return assertSuccess(data);
}

export async function apiLogout(): Promise<void> {
  await authClient.post('/logout');
}

export async function apiGetMe(): Promise<AuthUser> {
  const { data } = await authClient.get<ApiSuccessResponse<AuthUser> | ApiErrorResponse>('/me');
  return normalizeAuthUser(assertSuccess(data));
}

export async function apiExtendSession(): Promise<SessionExtension> {
  const { data } = await authClient.post<ApiSuccessResponse<SessionExtension> | ApiErrorResponse>(
    '/extend'
  );
  return assertSuccess(data);
}

export async function apiChangePassword(payload: ChangePasswordPayload): Promise<void> {
  const { data } = await authClient.put<ApiSuccessResponse<{ message: string }> | ApiErrorResponse>(
    '/password',
    {
      newPassword: payload.newPassword,
      password: payload.password ?? payload.currentPassword,
      googleIdToken: payload.googleIdToken,
    }
  );
  assertSuccess(data);
}

export async function apiDeleteAccount(payload: DeleteAccountPayload): Promise<void> {
  const { data } = await authClient.delete<
    ApiSuccessResponse<{ message: string }> | ApiErrorResponse
  >('/account', {
    data: {
      confirm: payload.confirm,
      password: payload.password,
      googleIdToken: payload.googleIdToken,
    },
  });
  assertSuccess(data);
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await authClient.post<
    ApiSuccessResponse<{ message: string }> | ApiErrorResponse
  >('/forgot-password', { email });
  return assertSuccess(data);
}

export async function apiResetPassword(payload: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const { data } = await authClient.post<
    ApiSuccessResponse<{ message: string }> | ApiErrorResponse
  >('/reset-password', payload);
  return assertSuccess(data);
}
