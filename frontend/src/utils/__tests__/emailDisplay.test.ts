import { formatMemberSince, getEmailInitials, maskEmail } from '../emailDisplay';

describe('emailDisplay', () => {
  it('masks the local part of a valid email', () => {
    expect(maskEmail('investor@example.com')).toBe('in••••••@example.com');
  });

  it('returns the original string when the email has no usable local part', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
    expect(maskEmail('@example.com')).toBe('@example.com');
  });

  it('builds initials from the local part', () => {
    expect(getEmailInitials('ab@example.com')).toBe('AB');
  });

  it('formats a valid created-at date and falls back for invalid input', () => {
    expect(formatMemberSince('not-a-date')).toBe('—');
    expect(formatMemberSince('2026-03-15T00:00:00.000Z')).toMatch(/2026/);
  });
});
