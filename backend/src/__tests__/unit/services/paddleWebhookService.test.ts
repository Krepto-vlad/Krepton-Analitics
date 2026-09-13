jest.mock('../../../repositories/billingRepository.js', () => ({
  findBillingCustomerByPaddleCustomerId: jest.fn(),
  insertBillingWebhookEventIfNew: jest.fn(),
  upsertBillingCustomer: jest.fn(),
  upsertPaddleEntitlement: jest.fn(),
}));

jest.mock('../../../services/paddleClient.js', () => ({
  requirePaddleClient: jest.fn(),
}));

import { EventName, type SubscriptionNotification } from '@paddle/paddle-node-sdk';
import {
  findBillingCustomerByPaddleCustomerId,
  insertBillingWebhookEventIfNew,
  upsertBillingCustomer,
  upsertPaddleEntitlement,
} from '../../../repositories/billingRepository.js';
import { requirePaddleClient } from '../../../services/paddleClient.js';
import {
  applyPaddleSubscriptionNotification,
  processPaddleWebhookEvent,
  verifyAndProcessPaddleWebhook,
} from '../../../services/paddleWebhookService.js';
import { BILLING_WEBHOOK_INVALID_SIGNATURE_MESSAGE } from '../../../constants.js';

const mockedInsertEvent = insertBillingWebhookEventIfNew as jest.MockedFunction<
  typeof insertBillingWebhookEventIfNew
>;
const mockedFindCustomer = findBillingCustomerByPaddleCustomerId as jest.MockedFunction<
  typeof findBillingCustomerByPaddleCustomerId
>;
const mockedUpsertCustomer = upsertBillingCustomer as jest.MockedFunction<
  typeof upsertBillingCustomer
>;
const mockedUpsertEntitlement = upsertPaddleEntitlement as jest.MockedFunction<
  typeof upsertPaddleEntitlement
>;
const mockedRequirePaddle = requirePaddleClient as jest.MockedFunction<typeof requirePaddleClient>;

function buildSubscription(
  overrides: Partial<SubscriptionNotification> = {}
): SubscriptionNotification {
  return {
    id: 'sub_1',
    status: 'active',
    customerId: 'ctm_1',
    customData: { userId: 'user-1' },
    billingCycle: { interval: 'month', frequency: 1 },
    currentBillingPeriod: {
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
    },
    scheduledChange: { action: 'cancel', effectiveAt: '2026-07-01T00:00:00.000Z', resumeAt: null },
    ...overrides,
  } as SubscriptionNotification;
}

describe('paddleWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpsertCustomer.mockResolvedValue({
      user_id: 'user-1',
      paddle_customer_id: 'ctm_1',
      created_at: new Date(),
    });
    mockedUpsertEntitlement.mockResolvedValue({
      user_id: 'user-1',
      paddle_subscription_id: 'sub_1',
      paddle_status: 'active',
      paddle_interval: 'month',
      paddle_period_start: new Date('2026-06-01T00:00:00.000Z'),
      paddle_period_end: new Date('2026-07-01T00:00:00.000Z'),
      paddle_cancel_at_period_end: true,
      admin_expires_at: null,
      updated_at: new Date(),
    });
  });

  it('upserts Paddle period dates from the webhook payload', async () => {
    await applyPaddleSubscriptionNotification(buildSubscription());

    expect(mockedUpsertEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        paddlePeriodEnd: new Date('2026-07-01T00:00:00.000Z'),
        paddleCancelAtPeriodEnd: true,
        paddleInterval: 'month',
      })
    );
  });

  it('resolves the user from the Paddle customer when custom data is missing', async () => {
    mockedFindCustomer.mockResolvedValue({
      user_id: 'user-9',
      paddle_customer_id: 'ctm_1',
      created_at: new Date(),
    });

    await applyPaddleSubscriptionNotification(buildSubscription({ customData: null }));

    expect(mockedUpsertEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-9' })
    );
  });

  it('skips duplicate webhook event ids', async () => {
    mockedInsertEvent.mockResolvedValue(false);

    await processPaddleWebhookEvent({
      eventId: 'evt_1',
      eventType: 'subscription.updated',
      data: buildSubscription(),
    } as never);

    expect(mockedUpsertEntitlement).not.toHaveBeenCalled();
  });

  it('ignores a subscription event that cannot be mapped to a user', async () => {
    mockedFindCustomer.mockResolvedValue(null);

    await applyPaddleSubscriptionNotification(buildSubscription({ customData: null }));

    expect(mockedUpsertEntitlement).not.toHaveBeenCalled();
  });

  it('ignores non-subscription webhook events', async () => {
    mockedInsertEvent.mockResolvedValue(true);

    await processPaddleWebhookEvent({
      eventId: 'evt_2',
      eventType: 'transaction.completed',
      data: {},
    } as never);

    expect(mockedUpsertEntitlement).not.toHaveBeenCalled();
  });

  it('applies a new subscription webhook after signature verification', async () => {
    mockedInsertEvent.mockResolvedValue(true);
    mockedRequirePaddle.mockReturnValue({
      webhooks: {
        unmarshal: jest.fn().mockResolvedValue({
          eventId: 'evt_3',
          eventType: EventName.SubscriptionUpdated,
          data: buildSubscription(),
        }),
      },
    } as never);

    await verifyAndProcessPaddleWebhook('{}', 'sig');

    expect(mockedUpsertEntitlement).toHaveBeenCalled();
  });

  it('rejects an invalid webhook signature', async () => {
    mockedRequirePaddle.mockReturnValue({
      webhooks: {
        unmarshal: jest.fn().mockRejectedValue(new Error('bad sig')),
      },
    } as never);

    await expect(verifyAndProcessPaddleWebhook('{}', 'bad')).rejects.toMatchObject({
      statusCode: 400,
      message: BILLING_WEBHOOK_INVALID_SIGNATURE_MESSAGE,
    });
  });
});
