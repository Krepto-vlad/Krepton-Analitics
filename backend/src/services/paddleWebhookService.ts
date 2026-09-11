import {
  EventName,
  type EventEntity,
  type SubscriptionNotification,
} from '@paddle/paddle-node-sdk';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  BILLING_CUSTOM_DATA_USER_ID_KEY,
  BILLING_WEBHOOK_INVALID_SIGNATURE_MESSAGE,
  LOG_EVENT,
} from '../constants.js';
import { env } from '../config/env.js';
import { requirePaddleClient } from './paddleClient.js';
import {
  findBillingCustomerByPaddleCustomerId,
  insertBillingWebhookEventIfNew,
  upsertBillingCustomer,
  upsertPaddleEntitlement,
} from '../repositories/billingRepository.js';

const SUBSCRIPTION_EVENT_TYPES = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionCanceled,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionResumed,
  EventName.SubscriptionTrialing,
]);

function readCustomUserId(customData: Record<string, unknown> | null | undefined): string | null {
  if (!customData) {
    return null;
  }

  const userId = customData[BILLING_CUSTOM_DATA_USER_ID_KEY];
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
}

export async function applyPaddleSubscriptionNotification(
  subscription: SubscriptionNotification
): Promise<void> {
  const customUserId = readCustomUserId(subscription.customData as Record<string, unknown> | null);
  const customer = customUserId
    ? null
    : await findBillingCustomerByPaddleCustomerId(subscription.customerId);
  const userId = customUserId ?? customer?.user_id;

  if (!userId) {
    logger.warn(
      { event: LOG_EVENT.APP_ERROR, paddleSubscriptionId: subscription.id },
      'Paddle subscription webhook missing Krepton user id'
    );
    return;
  }

  await upsertBillingCustomer(userId, subscription.customerId);

  const interval = subscription.billingCycle.interval === 'year' ? 'year' : 'month';
  const period = subscription.currentBillingPeriod;
  const cancelAtPeriodEnd = subscription.scheduledChange?.action === 'cancel';

  await upsertPaddleEntitlement({
    userId,
    paddleSubscriptionId: subscription.id,
    paddleStatus: subscription.status,
    paddleInterval: interval,
    paddlePeriodStart: period ? new Date(period.startsAt) : null,
    paddlePeriodEnd: period ? new Date(period.endsAt) : null,
    paddleCancelAtPeriodEnd: cancelAtPeriodEnd,
  });
}

export async function processPaddleWebhookEvent(event: EventEntity): Promise<void> {
  const isNew = await insertBillingWebhookEventIfNew(event.eventId, event.eventType);
  if (!isNew) {
    return;
  }

  if (!SUBSCRIPTION_EVENT_TYPES.has(event.eventType)) {
    return;
  }

  await applyPaddleSubscriptionNotification(event.data as SubscriptionNotification);
}

export async function verifyAndProcessPaddleWebhook(
  rawBody: string,
  signature: string
): Promise<void> {
  const paddle = requirePaddleClient();

  try {
    const event = await paddle.webhooks.unmarshal(rawBody, env.paddleWebhookSecret, signature);
    await processPaddleWebhookEvent(event);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.warn({ event: LOG_EVENT.APP_ERROR, err: error }, 'Paddle webhook rejected');
    throw new AppError(400, BILLING_WEBHOOK_INVALID_SIGNATURE_MESSAGE);
  }
}
