import type { SubscriptionSummary } from '../types/billing.types';
import { PLUS_ANNUAL_DISPLAY_PRICE, PLUS_MONTHLY_DISPLAY_PRICE } from '../constants/pricingPlans';

export function formatSubscriptionHeadline(subscription: SubscriptionSummary): string {
  if (!subscription.isPaid) {
    return 'Free — $0 / forever';
  }

  if (subscription.source === 'admin') {
    return 'Plus — complimentary';
  }

  if (subscription.interval === 'year') {
    return `Plus — ${PLUS_ANNUAL_DISPLAY_PRICE} / year`;
  }

  return `Plus — ${PLUS_MONTHLY_DISPLAY_PRICE} / month`;
}

export function formatSubscriptionPeriodEnd(subscription: SubscriptionSummary): string | null {
  if (!subscription.currentPeriodEnd) {
    return null;
  }

  const formatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(subscription.currentPeriodEnd));

  if (subscription.cancelAtPeriodEnd) {
    return `Access until ${formatted} (cancels at period end)`;
  }

  if (subscription.source === 'admin') {
    return `Complimentary access until ${formatted}`;
  }

  return `Current period ends ${formatted}`;
}
