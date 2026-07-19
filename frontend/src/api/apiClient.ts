import axios, { type AxiosInstance } from 'axios';
import { ERROR_MESSAGES } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import { ApiRequestError, toApiRequestError } from '../utils/apiError';

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toApiRequestError(error))
  );

  return client;
}

export function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) {
    throw new ApiRequestError(data.error ?? ERROR_MESSAGES.UNKNOWN, undefined, 'client');
  }

  return data.data;
}
