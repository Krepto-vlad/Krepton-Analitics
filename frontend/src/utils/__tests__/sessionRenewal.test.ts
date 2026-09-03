import { SESSION_RENEW_REMAINING_MS } from '../../constants';
import { isSessionDueForRenewal } from '../sessionRenewal';

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
