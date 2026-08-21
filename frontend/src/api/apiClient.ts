import axios, { type AxiosInstance } from 'axios';
import { ERROR_MESSAGES, HTTP_UNAUTHORIZED_STATUS } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import { ApiRequestError, toApiRequestError } from '../utils/apiError';
import { isExpiredSessionUnauthorized, notifyUnauthorized } from './unauthorizedSession';

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === HTTP_UNAUTHORIZED_STATUS) {
        if (isExpiredSessionUnauthorized(error)) {
          notifyUnauthorized();
        }
      }

      return Promise.reject(toApiRequestError(error));
    }
  );

  return client;
}

export function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) {
    throw new ApiRequestError(data.error ?? ERROR_MESSAGES.UNKNOWN, undefined, 'client');
  }

  return data.data;
}
