import type { AxiosError } from 'axios';
import { PUBLIC_AUTH_API_PATH_MARKERS, SESSION_EXPIRED_API_MESSAGES } from '../constants';
import type { ApiErrorResponse } from '../types/stock.types';

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function notifyUnauthorized(): void {
  onUnauthorized?.();
}

export function isPublicAuthRequestUrl(requestUrl: string): boolean {
  return PUBLIC_AUTH_API_PATH_MARKERS.some((marker) => requestUrl.includes(marker));
}

export function resolveAxiosRequestUrl(error: AxiosError): string {
  const url = error.config?.url ?? '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const baseURL = error.config?.baseURL ?? '';
  return `${baseURL}${url}`;
}

export function isExpiredSessionUnauthorized(error: AxiosError): boolean {
  const requestUrl = resolveAxiosRequestUrl(error);
  if (isPublicAuthRequestUrl(requestUrl)) {
    return false;
  }

  const body = error.response?.data as ApiErrorResponse | undefined;
  const backendMessage = body?.error?.trim();
  if (!backendMessage) {
    return true;
  }

  return (SESSION_EXPIRED_API_MESSAGES as readonly string[]).includes(backendMessage);
}
