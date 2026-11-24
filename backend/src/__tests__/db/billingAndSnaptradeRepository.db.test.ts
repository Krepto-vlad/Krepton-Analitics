import {
  findBillingCustomerByPaddleCustomerId,
  findBillingCustomerByUserId,
  findBillingEntitlementByUserId,
  insertBillingWebhookEventIfNew,
  upsertAdminEntitlement,
  upsertBillingCustomer,
  upsertPaddleEntitlement,
} from '../../repositories/billingRepository.js';
import {
  deleteSnaptradeUserByUserId,
  findSnaptradeUserByUserId,
  upsertSnaptradeUser,
} from '../../repositories/snaptradeRepository.js';
import { MILLISECONDS_PER_DAY, POSTGRES_ERROR_CODE } from './helpers/dbTestConstants.js';
import {
  captureDatabaseError,
  closeTestDatabasePool,
  createTestUser,
  truncateAllTables,
} from './helpers/testDatabase.js';

const PADDLE_CUSTOMER_ID = 'ctm_integration_1';
const REPLACEMENT_PADDLE_CUSTOMER_ID = 'ctm_integration_2';
const PADDLE_SUBSCRIPTION_ID = 'sub_integration_1';
const PADDLE_STATUS_ACTIVE = 'active';
const PADDLE_STATUS_CANCELED = 'canceled';
const PADDLE_INTERVAL_MONTH = 'month';
const WEBHOOK_EVENT_ID = 'evt_integration_1';
const WEBHOOK_EVENT_TYPE = 'subscription.updated';
const SNAPTRADE_USER_ID = 'snaptrade-user-1';
const REPLACEMENT_SNAPTRADE_USER_ID = 'snaptrade-user-2';
const SNAPTRADE_SECRET = 'snaptrade-secret-1';
const REPLACEMENT_SNAPTRADE_SECRET = 'snaptrade-secret-2';

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * MILLISECONDS_PER_DAY);
}

function buildPaddleEntitlementParams(userId: string, status: string, cancelAtPeriodEnd: boolean) {
  return {
    userId,
    paddleSubscriptionId: PADDLE_SUBSCRIPTION_ID,
    paddleStatus: status,
    paddleInterval: PADDLE_INTERVAL_MONTH,
    paddlePeriodStart: daysFromNow(0),
    paddlePeriodEnd: daysFromNow(30),
    paddleCancelAtPeriodEnd: cancelAtPeriodEnd,
  };
}

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('billing customers', () => {
  it('links a Paddle customer to a user and finds it from either side', async () => {
    const user = await createTestUser();

    const stored = await upsertBillingCustomer(user.id, PADDLE_CUSTOMER_ID);

    expect(stored.paddle_customer_id).toBe(PADDLE_CUSTOMER_ID);
    expect((await findBillingCustomerByUserId(user.id))?.paddle_customer_id).toBe(
      PADDLE_CUSTOMER_ID
    );
    expect((await findBillingCustomerByPaddleCustomerId(PADDLE_CUSTOMER_ID))?.user_id).toBe(
      user.id
    );
  });

  it('keeps one customer per user and replaces the Paddle id on a repeat call', async () => {
    const user = await createTestUser();
    await upsertBillingCustomer(user.id, PADDLE_CUSTOMER_ID);

    const replaced = await upsertBillingCustomer(user.id, REPLACEMENT_PADDLE_CUSTOMER_ID);

    expect(replaced.paddle_customer_id).toBe(REPLACEMENT_PADDLE_CUSTOMER_ID);
    expect(await findBillingCustomerByPaddleCustomerId(PADDLE_CUSTOMER_ID)).toBeNull();
  });

  it('refuses one Paddle customer id for two users', async () => {
    const first = await createTestUser();
    const second = await createTestUser();
    await upsertBillingCustomer(first.id, PADDLE_CUSTOMER_ID);

    const error = await captureDatabaseError(upsertBillingCustomer(second.id, PADDLE_CUSTOMER_ID));

    expect(error.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
  });

  it('returns null when no customer exists', async () => {
    const user = await createTestUser();

    expect(await findBillingCustomerByUserId(user.id)).toBeNull();
    expect(await findBillingCustomerByPaddleCustomerId('ctm_unknown')).toBeNull();
  });
});

describe('billing entitlements', () => {
  it('stores a Paddle subscription and updates it in place', async () => {
    const user = await createTestUser();

    const active = await upsertPaddleEntitlement(
      buildPaddleEntitlementParams(user.id, PADDLE_STATUS_ACTIVE, false)
    );
    const canceled = await upsertPaddleEntitlement(
      buildPaddleEntitlementParams(user.id, PADDLE_STATUS_CANCELED, true)
    );

    expect(active.paddle_status).toBe(PADDLE_STATUS_ACTIVE);
    expect(canceled.paddle_status).toBe(PADDLE_STATUS_CANCELED);
    expect(canceled.paddle_cancel_at_period_end).toBe(true);
    expect((await findBillingEntitlementByUserId(user.id))?.paddle_status).toBe(
      PADDLE_STATUS_CANCELED
    );
  });

  it('grants an admin entitlement without a Paddle subscription', async () => {
    const user = await createTestUser();
    const expiresAt = daysFromNow(7);

    const granted = await upsertAdminEntitlement(user.id, expiresAt);

    expect(granted.admin_expires_at?.getTime()).toBe(expiresAt.getTime());
    expect(granted.paddle_subscription_id).toBeNull();
  });

  it('keeps the Paddle subscription when an admin entitlement is added later', async () => {
    const user = await createTestUser();
    await upsertPaddleEntitlement(
      buildPaddleEntitlementParams(user.id, PADDLE_STATUS_ACTIVE, false)
    );

    const combined = await upsertAdminEntitlement(user.id, daysFromNow(7));

    expect(combined.paddle_subscription_id).toBe(PADDLE_SUBSCRIPTION_ID);
    expect(combined.paddle_status).toBe(PADDLE_STATUS_ACTIVE);
    expect(combined.admin_expires_at).not.toBeNull();
  });

  it('returns null when the user has no entitlement', async () => {
    const user = await createTestUser();

    expect(await findBillingEntitlementByUserId(user.id)).toBeNull();
  });
});

describe('billing webhook idempotency', () => {
  it('accepts an event once and reports a replay as already processed', async () => {
    expect(await insertBillingWebhookEventIfNew(WEBHOOK_EVENT_ID, WEBHOOK_EVENT_TYPE)).toBe(true);
    expect(await insertBillingWebhookEventIfNew(WEBHOOK_EVENT_ID, WEBHOOK_EVENT_TYPE)).toBe(false);
  });

  it('treats different event ids independently', async () => {
    expect(await insertBillingWebhookEventIfNew('evt_a', WEBHOOK_EVENT_TYPE)).toBe(true);
    expect(await insertBillingWebhookEventIfNew('evt_b', WEBHOOK_EVENT_TYPE)).toBe(true);
  });
});

describe('snaptrade users', () => {
  it('stores broker-sync credentials for a user and reads them back', async () => {
    const user = await createTestUser();

    const stored = await upsertSnaptradeUser(user.id, SNAPTRADE_USER_ID, SNAPTRADE_SECRET);

    expect(stored.snaptrade_user_id).toBe(SNAPTRADE_USER_ID);
    expect(await findSnaptradeUserByUserId(user.id)).toEqual(stored);
  });

  it('replaces the credentials on a repeat call and refreshes the update time', async () => {
    const user = await createTestUser();
    const first = await upsertSnaptradeUser(user.id, SNAPTRADE_USER_ID, SNAPTRADE_SECRET);

    const second = await upsertSnaptradeUser(
      user.id,
      REPLACEMENT_SNAPTRADE_USER_ID,
      REPLACEMENT_SNAPTRADE_SECRET
    );

    expect(second.snaptrade_user_id).toBe(REPLACEMENT_SNAPTRADE_USER_ID);
    expect(second.user_secret).toBe(REPLACEMENT_SNAPTRADE_SECRET);
    expect(second.updated_at.getTime()).toBeGreaterThanOrEqual(first.updated_at.getTime());
    expect(second.created_at.getTime()).toBe(first.created_at.getTime());
  });

  it('refuses one SnapTrade user id for two users', async () => {
    const first = await createTestUser();
    const second = await createTestUser();
    await upsertSnaptradeUser(first.id, SNAPTRADE_USER_ID, SNAPTRADE_SECRET);

    const error = await captureDatabaseError(
      upsertSnaptradeUser(second.id, SNAPTRADE_USER_ID, SNAPTRADE_SECRET)
    );

    expect(error.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
  });

  it('deletes the credentials and returns null afterwards', async () => {
    const user = await createTestUser();
    await upsertSnaptradeUser(user.id, SNAPTRADE_USER_ID, SNAPTRADE_SECRET);

    await deleteSnaptradeUserByUserId(user.id);

    expect(await findSnaptradeUserByUserId(user.id)).toBeNull();
  });
});
