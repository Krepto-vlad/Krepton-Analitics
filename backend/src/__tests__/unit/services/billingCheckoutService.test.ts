jest.mock('../../../repositories/userRepository.js', () => ({
  findUserById: jest.fn(),
}));

jest.mock('../../../repositories/billingRepository.js', () => ({
  findBillingCustomerByUserId: jest.fn(),
  findBillingEntitlementByUserId: jest.fn(),
  upsertBillingCustomer: jest.fn(),
}));

jest.mock('../../../services/paddleClient.js', () => ({
  requirePaddleClient: jest.fn(),
  getPaddlePriceIdForInterval: jest.fn((interval: 'month' | 'year') =>
    interval === 'year' ? 'pri_year' : 'pri_month'
  ),
}));

import { findUserById } from '../../../repositories/userRepository.js';
import {
  findBillingCustomerByUserId,
  findBillingEntitlementByUserId,
  upsertBillingCustomer,
} from '../../../repositories/billingRepository.js';
import { requirePaddleClient } from '../../../services/paddleClient.js';
import {
  cancelPaddleSubscriptionForUser,
  createCustomerPortalSession,
  createPlusCheckout,
} from '../../../services/billingCheckoutService.js';

const mockedFindUser = findUserById as jest.MockedFunction<typeof findUserById>;
const mockedFindCustomer = findBillingCustomerByUserId as jest.MockedFunction<
  typeof findBillingCustomerByUserId
>;
const mockedFindEntitlement = findBillingEntitlementByUserId as jest.MockedFunction<
  typeof findBillingEntitlementByUserId
>;
const mockedUpsertCustomer = upsertBillingCustomer as jest.MockedFunction<
  typeof upsertBillingCustomer
>;
const mockedRequirePaddle = requirePaddleClient as jest.MockedFunction<typeof requirePaddleClient>;

describe('billingCheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindUser.mockResolvedValue({
      id: 'user-1',
      email: 'investor@example.com',
      password_hash: 'hash',
      google_sub: null,
      email_verified: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      created_at: new Date(),
    });
    mockedFindCustomer.mockResolvedValue({
      user_id: 'user-1',
      paddle_customer_id: 'ctm_1',
      created_at: new Date(),
    });
    mockedRequirePaddle.mockReturnValue({
      transactions: {
        create: jest.fn().mockResolvedValue({ id: 'txn_1' }),
      },
    } as never);
  });

  it('creates a Paddle transaction for the selected interval', async () => {
    const result = await createPlusCheckout('user-1', 'year');

    expect(result.transactionId).toBe('txn_1');
    expect(mockedRequirePaddle().transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'ctm_1',
        items: [{ priceId: 'pri_year', quantity: 1 }],
        customData: { userId: 'user-1' },
      })
    );
  });

  it('rejects an unknown interval', async () => {
    await expect(createPlusCheckout('user-1', 'weekly')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('creates a Paddle customer when none is stored yet', async () => {
    mockedFindCustomer.mockResolvedValue(null);
    mockedUpsertCustomer.mockResolvedValue({
      user_id: 'user-1',
      paddle_customer_id: 'ctm_new',
      created_at: new Date(),
    });
    mockedRequirePaddle.mockReturnValue({
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'ctm_new' }),
      },
      transactions: {
        create: jest.fn().mockResolvedValue({ id: 'txn_2' }),
      },
    } as never);

    const result = await createPlusCheckout('user-1', 'month');

    expect(result.transactionId).toBe('txn_2');
    expect(mockedUpsertCustomer).toHaveBeenCalledWith('user-1', 'ctm_new');
  });

  it('surfaces a Paddle dashboard error instead of a generic 500', async () => {
    mockedRequirePaddle.mockReturnValue({
      transactions: {
        create: jest.fn().mockRejectedValue({
          detail:
            'Cannot create a transaction or open a checkout as no default payment link has been set for this account. Set in the Paddle dashboard, then try again.',
        }),
      },
    } as never);

    await expect(createPlusCheckout('user-1', 'month')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('default payment link'),
    });
  });

  it('opens a customer portal for an existing Paddle customer', async () => {
    mockedFindEntitlement.mockResolvedValue({
      user_id: 'user-1',
      paddle_subscription_id: 'sub_1',
      paddle_status: 'active',
      paddle_interval: 'month',
      paddle_period_start: new Date(),
      paddle_period_end: new Date(),
      paddle_cancel_at_period_end: false,
      admin_expires_at: null,
      updated_at: new Date(),
    });
    mockedRequirePaddle.mockReturnValue({
      customerPortalSessions: {
        create: jest.fn().mockResolvedValue({
          urls: { general: { overview: 'https://paddle.example/portal' } },
        }),
      },
    } as never);

    const result = await createCustomerPortalSession('user-1');

    expect(result.url).toBe('https://paddle.example/portal');
  });

  it('skips Paddle cancel when the user has no subscription id', async () => {
    mockedFindEntitlement.mockResolvedValue(null);

    await cancelPaddleSubscriptionForUser('user-1');

    expect(mockedRequirePaddle).not.toHaveBeenCalled();
  });

  it('cancels an existing Paddle subscription on account delete', async () => {
    mockedFindEntitlement.mockResolvedValue({
      user_id: 'user-1',
      paddle_subscription_id: 'sub_1',
      paddle_status: 'active',
      paddle_interval: 'month',
      paddle_period_start: new Date(),
      paddle_period_end: new Date(),
      paddle_cancel_at_period_end: false,
      admin_expires_at: null,
      updated_at: new Date(),
    });
    const cancel = jest.fn().mockResolvedValue(undefined);
    mockedRequirePaddle.mockReturnValue({
      subscriptions: { cancel },
    } as never);

    await cancelPaddleSubscriptionForUser('user-1');

    expect(cancel).toHaveBeenCalledWith('sub_1', { effectiveFrom: 'immediately' });
  });

  it('rejects a portal session when no Paddle customer exists', async () => {
    mockedFindCustomer.mockResolvedValue(null);

    await expect(createCustomerPortalSession('user-1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
