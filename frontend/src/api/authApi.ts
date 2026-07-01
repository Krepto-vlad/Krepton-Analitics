import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { AuthUser, LoginCredentials, RegisterCredentials } from '../types/auth.types';
import type { ApiErrorResponse } from '../types/stock.types';

const authClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  withCredentials: true,
});

function assertSuccess<T>(data: { success: boolean; data?: T; error?: string }): T {
  if (!data.success) throw new Error((data as ApiErrorResponse).error ?? 'Unknown error');
  return data.data as T;
}

export async function apiRegister(credentials: RegisterCredentials): Promise<AuthUser> {
  const { data } = await authClient.post('/register', credentials);
  return assertSuccess<AuthUser>(data);
}

export async function apiLogin(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await authClient.post('/login', credentials);
  return assertSuccess<AuthUser>(data);
}

export async function apiLogout(): Promise<void> {
  await authClient.post('/logout');
}

export async function apiGetMe(): Promise<AuthUser> {
  const { data } = await authClient.get('/me');
  return assertSuccess<AuthUser>(data);
}
