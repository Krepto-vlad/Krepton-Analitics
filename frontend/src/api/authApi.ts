import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth.types';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';

const authClient = createApiClient(`${API_BASE_URL}/api/auth`);

export async function apiRegister(credentials: RegisterCredentials): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/register',
    credentials
  );
  return assertSuccess(data);
}

export async function apiLogin(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await authClient.post<ApiSuccessResponse<AuthUser> | ApiErrorResponse>(
    '/login',
    credentials
  );
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
    payload
  );
  assertSuccess(data);
}
