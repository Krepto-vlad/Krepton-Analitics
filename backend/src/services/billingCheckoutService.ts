import {
  BILLING_CHECKOUT_INTERVALS,
  BILLING_CUSTOM_DATA_USER_ID_KEY,
  BILLING_NOT_CONFIGURED_MESSAGE,
  type BillingCheckoutInterval,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { findUserById } from '../repositories/userRepository.js';
import {
  findBillingCustomerByUserId,
  findBillingEntitlementByUserId,
  upsertBillingCustomer,
} from '../repositories/billingRepository.js';
import { getPaddlePriceIdForInterval, requirePaddleClient } from './paddleClient.js';
import type { CreateCheckoutResult, CustomerPortalResult } from '../types/billing.types.js';

function rethrowPaddleApiError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'detail' in error &&
    typeof error.detail === 'string' &&
    error.detail.length > 0
  ) {
    throw new AppError(400, error.detail);
  }

  throw error;
}

function assertCheckoutInterval(interval: unknown): BillingCheckoutInterval {
  if (
    typeof interval !== 'string' ||
    !(BILLING_CHECKOUT_INTERVALS as readonly string[]).includes(interval)
  ) {
    throw new AppError(400, 'interval must be month or year');
  }

  return interval as BillingCheckoutInterval;
}

async function requireUserEmail(userId: string): Promise<string> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'User not found');
  }

  return user.email;
}

async function getOrCreatePaddleCustomerId(userId: string, email: string): Promise<string> {
  const existing = await findBillingCustomerByUserId(userId);
  if (existing) {
    return existing.paddle_customer_id;
  }

  const paddle = requirePaddleClient();
  try {
    const customer = await paddle.customers.create({
      email,
      customData: { [BILLING_CUSTOM_DATA_USER_ID_KEY]: userId },
    });
    await upsertBillingCustomer(userId, customer.id);
    return customer.id;
  } catch (error) {
    rethrowPaddleApiError(error);
  }
}

export async function createPlusCheckout(
  userId: string,
  intervalValue: unknown
): Promise<CreateCheckoutResult> {
  const interval = assertCheckoutInterval(intervalValue);
  const email = await requireUserEmail(userId);
  const paddle = requirePaddleClient();
  const customerId = await getOrCreatePaddleCustomerId(userId, email);
  const priceId = getPaddlePriceIdForInterval(interval);

  if (!priceId) {
    throw new AppError(503, BILLING_NOT_CONFIGURED_MESSAGE);
  }

  try {
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customerId,
      customData: { [BILLING_CUSTOM_DATA_USER_ID_KEY]: userId },
    });

    return { transactionId: transaction.id };
  } catch (error) {
    rethrowPaddleApiError(error);
  }
}

export async function createCustomerPortalSession(userId: string): Promise<CustomerPortalResult> {
  const paddle = requirePaddleClient();
  const customer = await findBillingCustomerByUserId(userId);
  if (!customer) {
    throw new AppError(400, 'No Paddle customer exists for this account yet.');
  }

  const entitlement = await findBillingEntitlementByUserId(userId);
  const subscriptionIds = entitlement?.paddle_subscription_id
    ? [entitlement.paddle_subscription_id]
    : [];
  try {
    const session = await paddle.customerPortalSessions.create(
      customer.paddle_customer_id,
      subscriptionIds
    );

    return { url: session.urls.general.overview };
  } catch (error) {
    rethrowPaddleApiError(error);
  }
}

export async function cancelPaddleSubscriptionForUser(userId: string): Promise<void> {
  const entitlement = await findBillingEntitlementByUserId(userId);
  if (!entitlement?.paddle_subscription_id) {
    return;
  }

  try {
    const paddle = requirePaddleClient();
    await paddle.subscriptions.cancel(entitlement.paddle_subscription_id, {
      effectiveFrom: 'immediately',
    });
  } catch (error) {
    logger.warn(
      { err: error, userId },
      'Failed to cancel Paddle subscription during account delete'
    );
  }
}
