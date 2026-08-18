import { CLIENT_ERROR_LOG_PREFIX } from '../constants';

export function logClientError(error: Error, componentStack?: string | null): void {
  console.error(CLIENT_ERROR_LOG_PREFIX, error.message, componentStack ?? '');
}
