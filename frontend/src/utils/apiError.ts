import axios from 'axios';
import { ERROR_MESSAGES } from '../constants';
import type { ApiErrorResponse } from '../types/stock.types';

export type ApiErrorKind = 'network' | 'timeout' | 'client' | 'server' | 'unknown';

const AXIOS_STATUS_PATTERN = /^Request failed with status code \d+$/;
const SAFE_SERVER_MESSAGES = new Set([
  'Internal server error',
  'AI summarization is not configured on the server.',
  'AI service is temporarily busy. Please try again later.',
  'AI service is unavailable. Please try again later.',
  'Gemini quota or billing limit reached. Check AI Studio limits or try again later.',
]);

const UNSAFE_MESSAGE_PATTERNS = [
  /ECONNREFUSED/i,
  /postgres/i,
  /sequelize/i,
  /stack trace/i,
  /unexpected token/i,
  /syntax error/i,
];

export class ApiRequestError extends Error {
  readonly statusCode?: number;
  readonly kind: ApiErrorKind;

  constructor(message: string, statusCode?: number, kind: ApiErrorKind = 'unknown') {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.kind = kind;
  }
}

function isAxiosNoise(message: string): boolean {
  return (
    message === 'Unknown error' || message === 'Network Error' || AXIOS_STATUS_PATTERN.test(message)
  );
}

function isSafeBackendMessage(statusCode: number | undefined, message: string): boolean {
  if (!message || isAxiosNoise(message)) return false;
  if (message.length > 250) return false;
  if (UNSAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) return false;

  if (statusCode !== undefined && statusCode >= 500) {
    return SAFE_SERVER_MESSAGES.has(message);
  }

  return true;
}

function classifyErrorKind(
  statusCode: number | undefined,
  axiosError: import('axios').AxiosError | null
): ApiErrorKind {
  if (axiosError && !axiosError.response) {
    return axiosError.code === 'ECONNABORTED' ? 'timeout' : 'network';
  }

  if (statusCode === undefined) return 'unknown';
  if (statusCode >= 500) return 'server';
  if (statusCode >= 400) return 'client';
  return 'unknown';
}

function getStatusFallback(statusCode: number | undefined, fallback?: string): string {
  switch (statusCode) {
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 409:
      return ERROR_MESSAGES.CONFLICT;
    case 429:
      return ERROR_MESSAGES.RATE_LIMIT;
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER;
    default:
      if (statusCode !== undefined && statusCode >= 500) {
        return ERROR_MESSAGES.SERVER;
      }
      return fallback ?? ERROR_MESSAGES.UNKNOWN;
  }
}

export function toApiRequestError(error: unknown, fallback?: string): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const body = error.response?.data as ApiErrorResponse | undefined;
    const backendMessage = body?.error?.trim();
    const kind = classifyErrorKind(statusCode, error);

    if (backendMessage && isSafeBackendMessage(statusCode, backendMessage)) {
      return new ApiRequestError(backendMessage, statusCode, kind);
    }

    if (!error.response) {
      const message =
        error.code === 'ECONNABORTED' ? ERROR_MESSAGES.TIMEOUT : ERROR_MESSAGES.NETWORK;
      return new ApiRequestError(message, undefined, kind);
    }

    return new ApiRequestError(getStatusFallback(statusCode, fallback), statusCode, kind);
  }

  if (error instanceof Error && !isAxiosNoise(error.message)) {
    return new ApiRequestError(error.message, undefined, 'unknown');
  }

  return new ApiRequestError(fallback ?? ERROR_MESSAGES.UNKNOWN, undefined, 'unknown');
}

export function getRejectedMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return toApiRequestError(error, fallback).message;
}
