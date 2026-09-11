jest.mock('../../../repositories/billingRepository.js', () => ({
  findBillingEntitlementByUserId: jest.fn(),
}));

import { BILLING_ACCESS_GRACE_MS } from '../../../constants.js';
import type { BillingEntitlementRow } from '../../../types/billing.types.js';
import { findBillingEntitlementByUserId } from '../../../repositories/billingRepository.js';
import {
  getSubscriptionSummaryForUser,
  isAdminAccessActive,
  isPaidUser,
  isPaddleAccessActive,
  toSubscriptionSummary,
} from '../../../services/entitlementService.js';

function buildEntitlement(overrides: Partial<BillingEntitlementRow> = {}): BillingEntitlementRow {
  return {
    user_id: 'user-1',
    paddle_subscription_id: null,
    paddle_status: null,
    paddle_interval: null,
    paddle_period_start: null,
    paddle_period_end: null,
    paddle_cancel_at_period_end: false,
    admin_expires_at: null,
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('entitlementService', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('keeps canceled Paddle access until period_end plus grace', () => {
    const entitlement = buildEntitlement({
      paddle_subscription_id: 'sub_1',
      paddle_status: 'canceled',
      paddle_interval: 'month',
      paddle_period_end: new Date('2026-06-01T12:30:00.000Z'),
      paddle_cancel_at_period_end: true,
    });

    expect(isPaddleAccessActive(entitlement, now)).toBe(true);
    expect(toSubscriptionSummary(entitlement, now)).toMatchObject({
      isPaid: true,
      source: 'paddle',
      status: 'canceled',
      cancelAtPeriodEnd: true,
    });
  });

  it('does not end a period early when now is still before period_end', () => {
    const entitlement = buildEntitlement({
      paddle_status: 'active',
      paddle_interval: 'year',
      paddle_period_end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    expect(toSubscriptionSummary(entitlement, now).currentPeriodEnd).toBe(
      entitlement.paddle_period_end?.toISOString()
    );
  });

  it('drops Paddle access after period_end plus grace', () => {
    const entitlement = buildEntitlement({
      paddle_status: 'active',
      paddle_interval: 'month',
      paddle_period_end: new Date(now.getTime() - BILLING_ACCESS_GRACE_MS - 1),
    });

    expect(isPaddleAccessActive(entitlement, now)).toBe(false);
    expect(toSubscriptionSummary(entitlement, now).isPaid).toBe(false);
  });

  it('keeps complimentary admin access independently of Paddle', () => {
    const entitlement = buildEntitlement({
      paddle_status: 'canceled',
      paddle_interval: 'month',
      paddle_period_end: new Date(now.getTime() - BILLING_ACCESS_GRACE_MS - 1_000),
      admin_expires_at: new Date('2026-12-01T00:00:00.000Z'),
    });

    expect(isPaddleAccessActive(entitlement, now)).toBe(false);
    expect(isAdminAccessActive(entitlement, now)).toBe(true);
    expect(toSubscriptionSummary(entitlement, now)).toMatchObject({
      isPaid: true,
      source: 'admin',
      interval: 'comp',
    });
  });

  it('returns the free summary when no entitlement row exists', () => {
    expect(toSubscriptionSummary(null, now)).toMatchObject({
      isPaid: false,
      plan: 'free',
      status: 'none',
    });
  });

  it('surfaces past_due while the Paddle period is still open', () => {
    const entitlement = buildEntitlement({
      paddle_status: 'past_due',
      paddle_interval: 'month',
      paddle_period_end: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(toSubscriptionSummary(entitlement, now).status).toBe('past_due');
  });

  it('prefers a live Paddle window over an admin grant when both are active', () => {
    const entitlement = buildEntitlement({
      paddle_status: 'active',
      paddle_interval: 'month',
      paddle_period_end: new Date('2026-07-01T00:00:00.000Z'),
      admin_expires_at: new Date('2026-12-01T00:00:00.000Z'),
    });

    expect(toSubscriptionSummary(entitlement, now).source).toBe('paddle');
  });

  it('loads paid vs free access from the entitlement row', async () => {
    const mockedFind = findBillingEntitlementByUserId as jest.MockedFunction<
      typeof findBillingEntitlementByUserId
    >;
    mockedFind.mockResolvedValueOnce(null);
    await expect(isPaidUser('user-1')).resolves.toBe(false);

    mockedFind.mockResolvedValueOnce(
      buildEntitlement({
        paddle_status: 'active',
        paddle_interval: 'month',
        paddle_period_end: new Date('2026-12-01T00:00:00.000Z'),
      })
    );
    await expect(getSubscriptionSummaryForUser('user-1')).resolves.toMatchObject({
      isPaid: true,
      source: 'paddle',
    });
  });
});
