import { SESSION_RENEW_REMAINING_MS } from '../constants';

function getSessionRemainingMs(sessionExpiresAt: string, nowMs = Date.now()): number {
  return Date.parse(sessionExpiresAt) - nowMs;
}

export function isSessionDueForRenewal(sessionExpiresAt: string, nowMs = Date.now()): boolean {
  const remainingMs = getSessionRemainingMs(sessionExpiresAt, nowMs);
  return (
    Number.isFinite(remainingMs) && remainingMs > 0 && remainingMs <= SESSION_RENEW_REMAINING_MS
  );
}

/** Milliseconds until the sliding-renew window opens, or 0 if already inside it. */
export function getMsUntilSessionRenewalDue(
  sessionExpiresAt: string,
  nowMs = Date.now()
): number | null {
  const remainingMs = getSessionRemainingMs(sessionExpiresAt, nowMs);
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return null;
  }

  return Math.max(0, remainingMs - SESSION_RENEW_REMAINING_MS);
}
