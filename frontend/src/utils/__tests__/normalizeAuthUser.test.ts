import { FREE_SUBSCRIPTION_SUMMARY } from '../../types/billing.types';
import type { AuthUser } from '../../types/auth.types';
import { normalizeAuthUser } from '../normalizeAuthUser';

const baseUser = {
  id: 'user-1',
  email: 'investor@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
} as AuthUser;

describe('normalizeAuthUser', () => {
  it('fills a free subscription when the API omits billing fields', () => {
    const normalized = normalizeAuthUser(baseUser);

    expect(normalized.isAdmin).toBe(false);
    expect(normalized.subscription).toEqual(FREE_SUBSCRIPTION_SUMMARY);
    expect(normalized.subscription.isPaid).toBe(false);
  });

  it('keeps a paid subscription from a current API', () => {
    const normalized = normalizeAuthUser({
      ...baseUser,
      isAdmin: true,
      subscription: {
        ...FREE_SUBSCRIPTION_SUMMARY,
        isPaid: true,
        plan: 'plus',
        status: 'active',
      },
    });

    expect(normalized.isAdmin).toBe(true);
    expect(normalized.subscription.isPaid).toBe(true);
    expect(normalized.subscription.plan).toBe('plus');
  });
});
