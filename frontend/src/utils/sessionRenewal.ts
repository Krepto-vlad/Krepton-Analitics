import { SESSION_RENEW_REMAINING_MS } from '../constants';

export function isSessionDueForRenewal(sessionExpiresAt: string, nowMs = Date.now()): boolean {
  const remainingMs = Date.parse(sessionExpiresAt) - nowMs;
  return (
    Number.isFinite(remainingMs) && remainingMs > 0 && remainingMs <= SESSION_RENEW_REMAINING_MS
  );
}
