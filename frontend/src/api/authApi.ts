import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  RegisterCredentials,
  RegisterPendingResult,
} from '../types/auth.types';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';

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
  return assertSuccess(data);
}

export async function apiGoogleLogin(idToken: string): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/google',
    { idToken }
  );
  return assertSuccess(data);
}

export async function apiVerifyEmail(token: string): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/verify-email',
    { token }
  );
  return assertSuccess(data);
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
