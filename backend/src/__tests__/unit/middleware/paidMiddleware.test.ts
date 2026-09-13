jest.mock('../../../services/entitlementService.js', () => ({
  isPaidUser: jest.fn(),
}));

import type { NextFunction } from 'express';
import { SNAPTRADE_PLUS_REQUIRED_MESSAGE } from '../../../constants.js';
import { paidMiddleware } from '../../../middleware/paidMiddleware.js';
import { isPaidUser } from '../../../services/entitlementService.js';
import { asResponse, createMockRequest, createMockResponse } from '../controllers/httpMocks.js';

const mockedIsPaid = isPaidUser as jest.MockedFunction<typeof isPaidUser>;

describe('paidMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a paid user', async () => {
    mockedIsPaid.mockResolvedValue(true);
    const next = jest.fn() as NextFunction;

    await paidMiddleware(createMockRequest(), asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('forwards 401 when the session has no user id', async () => {
    const next = jest.fn() as NextFunction;

    await paidMiddleware(
      createMockRequest({ userId: undefined }),
      asResponse(createMockResponse()),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('forwards 403 when the user is on Free', async () => {
    mockedIsPaid.mockResolvedValue(false);
    const next = jest.fn() as NextFunction;

    await paidMiddleware(createMockRequest(), asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: SNAPTRADE_PLUS_REQUIRED_MESSAGE,
      })
    );
  });
});
