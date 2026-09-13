import {
  BILLING_ACCESS_GRACE_MS,
  PADDLE_STATUSES_WITH_PERIOD_ACCESS,
  type PaddlePeriodAccessStatus,
} from '../constants.js';
import { findBillingEntitlementByUserId } from '../repositories/billingRepository.js';
import type { BillingEntitlementRow, SubscriptionSummary } from '../types/billing.types.js';
import { createFreeSubscriptionSummary } from '../types/billing.types.js';

function isPeriodAccessStatus(status: string | null): status is PaddlePeriodAccessStatus {
  return (
    status !== null && (PADDLE_STATUSES_WITH_PERIOD_ACCESS as readonly string[]).includes(status)
  );
}

function isTimestampStillActive(expiresAt: Date | null, now: Date, graceMs: number): boolean {
  if (!expiresAt) {
    return false;
  }

  return now.getTime() < expiresAt.getTime() + graceMs;
}

export function isPaddleAccessActive(
  entitlement: BillingEntitlementRow,
  now = new Date(),
  graceMs = BILLING_ACCESS_GRACE_MS
): boolean {
  if (!isPeriodAccessStatus(entitlement.paddle_status)) {
    return false;
  }

  return isTimestampStillActive(entitlement.paddle_period_end, now, graceMs);
}

export function isAdminAccessActive(
  entitlement: BillingEntitlementRow,
  now = new Date(),
  graceMs = BILLING_ACCESS_GRACE_MS
): boolean {
  return isTimestampStillActive(entitlement.admin_expires_at, now, graceMs);
}

export function toSubscriptionSummary(
  entitlement: BillingEntitlementRow | null,
  now = new Date(),
  graceMs = BILLING_ACCESS_GRACE_MS
): SubscriptionSummary {
  if (!entitlement) {
    return createFreeSubscriptionSummary();
  }

  const paddleActive = isPaddleAccessActive(entitlement, now, graceMs);
  const adminActive = isAdminAccessActive(entitlement, now, graceMs);

  if (!paddleActive && !adminActive) {
    return createFreeSubscriptionSummary();
  }

  if (paddleActive) {
    const paddleStatus =
      entitlement.paddle_status === 'past_due'
        ? 'past_due'
        : entitlement.paddle_status === 'canceled'
          ? 'canceled'
          : 'active';

    return {
      isPaid: true,
      plan: 'plus',
      interval: entitlement.paddle_interval === 'year' ? 'year' : 'month',
      source: 'paddle',
      status: paddleStatus,
      currentPeriodEnd: entitlement.paddle_period_end
        ? entitlement.paddle_period_end.toISOString()
        : null,
      cancelAtPeriodEnd: entitlement.paddle_cancel_at_period_end,
    };
  }

  return {
    isPaid: true,
    plan: 'plus',
    interval: 'comp',
    source: 'admin',
    status: 'active',
    currentPeriodEnd: entitlement.admin_expires_at
      ? entitlement.admin_expires_at.toISOString()
      : null,
    cancelAtPeriodEnd: false,
  };
}

export async function getSubscriptionSummaryForUser(userId: string): Promise<SubscriptionSummary> {
  const entitlement = await findBillingEntitlementByUserId(userId);
  return toSubscriptionSummary(entitlement);
}

export async function isPaidUser(userId: string): Promise<boolean> {
  const summary = await getSubscriptionSummaryForUser(userId);
  return summary.isPaid;
}
