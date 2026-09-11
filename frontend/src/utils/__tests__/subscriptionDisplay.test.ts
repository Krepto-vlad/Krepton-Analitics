import { FREE_SUBSCRIPTION_SUMMARY } from '../../types/billing.types';
import { formatSubscriptionHeadline, formatSubscriptionPeriodEnd } from '../subscriptionDisplay';

describe('subscriptionDisplay', () => {
  it('labels free and complimentary plans', () => {
    expect(formatSubscriptionHeadline(FREE_SUBSCRIPTION_SUMMARY)).toContain('Free');
    expect(
      formatSubscriptionHeadline({
        ...FREE_SUBSCRIPTION_SUMMARY,
        isPaid: true,
        plan: 'plus',
        interval: 'comp',
        source: 'admin',
        status: 'active',
        currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      })
    ).toContain('complimentary');
  });

  it('explains cancel-at-period-end', () => {
    expect(
      formatSubscriptionPeriodEnd({
        isPaid: true,
        plan: 'plus',
        interval: 'month',
        source: 'paddle',
        status: 'canceled',
        currentPeriodEnd: '2026-07-01T00:00:00.000Z',
        cancelAtPeriodEnd: true,
      })
    ).toMatch(/cancels at period end/i);
  });
});
