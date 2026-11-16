import type { AuthUser } from '../types/auth.types';
import { FREE_SUBSCRIPTION_SUMMARY } from '../types/billing.types';

/**
 * Older /me payloads omit billing fields. Keep the SPA from crashing on
 * `user.subscription.isPaid` until the API and frontend roll out together.
 */
export function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    isAdmin: Boolean(user.isAdmin),
    aiPersonalDataEnabled: user.aiPersonalDataEnabled !== false,
    subscription: user.subscription ?? FREE_SUBSCRIPTION_SUMMARY,
  };
}
