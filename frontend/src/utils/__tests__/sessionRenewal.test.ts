import { SESSION_RENEW_REMAINING_MS } from '../../constants';
import { getMsUntilSessionRenewalDue, isSessionDueForRenewal } from '../sessionRenewal';

describe('isSessionDueForRenewal', () => {
  const nowMs = Date.parse('2026-01-01T00:10:00.000Z');

  it('is false when more than half of the TTL remains', () => {
    const sessionExpiresAt = new Date(nowMs + SESSION_RENEW_REMAINING_MS + 1).toISOString();
    expect(isSessionDueForRenewal(sessionExpiresAt, nowMs)).toBe(false);
  });

  it('is true when remaining lifetime is at most half of the TTL', () => {
    const sessionExpiresAt = new Date(nowMs + SESSION_RENEW_REMAINING_MS).toISOString();
    expect(isSessionDueForRenewal(sessionExpiresAt, nowMs)).toBe(true);
  });

  it('is false when the session has already expired', () => {
    expect(isSessionDueForRenewal(new Date(nowMs - 1).toISOString(), nowMs)).toBe(false);
  });
});

describe('getMsUntilSessionRenewalDue', () => {
  const nowMs = Date.parse('2026-01-01T00:10:00.000Z');

  it('returns the wait until the sliding window opens', () => {
    const sessionExpiresAt = new Date(nowMs + SESSION_RENEW_REMAINING_MS + 4_000).toISOString();
    expect(getMsUntilSessionRenewalDue(sessionExpiresAt, nowMs)).toBe(4_000);
  });

  it('returns 0 when the session is already inside the sliding window', () => {
    const sessionExpiresAt = new Date(nowMs + SESSION_RENEW_REMAINING_MS / 2).toISOString();
    expect(getMsUntilSessionRenewalDue(sessionExpiresAt, nowMs)).toBe(0);
  });

  it('returns null when the session has already expired', () => {
    expect(getMsUntilSessionRenewalDue(new Date(nowMs - 1).toISOString(), nowMs)).toBeNull();
  });
});
