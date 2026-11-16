jest.mock('../../../repositories/userRepository.js', () => ({
  findUserByEmail: jest.fn(),
}));

jest.mock('../../../repositories/billingRepository.js', () => ({
  upsertAdminEntitlement: jest.fn(),
}));

jest.mock('../../../services/entitlementService.js', () => ({
  getSubscriptionSummaryForUser: jest.fn(),
}));

import { findUserByEmail } from '../../../repositories/userRepository.js';
import { upsertAdminEntitlement } from '../../../repositories/billingRepository.js';
import { getSubscriptionSummaryForUser } from '../../../services/entitlementService.js';
import {
  getAdminEntitlement,
  postAdminEntitlement,
} from '../../../controllers/adminBillingController.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedFindByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
const mockedUpsert = upsertAdminEntitlement as jest.MockedFunction<typeof upsertAdminEntitlement>;
const mockedSummary = getSubscriptionSummaryForUser as jest.MockedFunction<
  typeof getSubscriptionSummaryForUser
>;

describe('adminBillingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'friend@example.com',
      password_hash: 'hash',
      google_sub: null,
      email_verified: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      ai_personal_data_enabled: true,
      created_at: new Date(),
    });
    mockedSummary.mockResolvedValue({
      isPaid: true,
      plan: 'plus',
      interval: 'comp',
      source: 'admin',
      status: 'active',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    });
  });

  it('grants complimentary Plus until the given timestamp', async () => {
    const res = createMockResponse();

    await postAdminEntitlement(
      createMockRequest({
        body: { email: 'Friend@Example.com', expiresAt: '2026-12-01T00:00:00.000Z' },
      }),
      asResponse(res)
    );

    expect(mockedUpsert).toHaveBeenCalledWith('user-2', new Date('2026-12-01T00:00:00.000Z'));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        email: 'friend@example.com',
        expiresAt: '2026-12-01T00:00:00.000Z',
        isPaid: true,
      },
    });
  });

  it('looks up an entitlement by email', async () => {
    const res = createMockResponse();

    await getAdminEntitlement(
      createMockRequest({ query: { email: 'friend@example.com' } }),
      asResponse(res)
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        email: 'friend@example.com',
        expiresAt: '2026-12-01T00:00:00.000Z',
        isPaid: true,
      },
    });
  });

  it('rejects a missing email and an unknown user', async () => {
    await expect(
      postAdminEntitlement(createMockRequest({ body: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });

    mockedFindByEmail.mockResolvedValue(null);
    await expect(
      getAdminEntitlement(
        createMockRequest({ query: { email: 'missing@example.com' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
