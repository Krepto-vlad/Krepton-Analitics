jest.mock('../../../repositories/userRepository.js', () => ({
  findUserById: jest.fn(),
}));

jest.mock('../../../config/env.js', () => ({
  isAdminEmail: jest.fn(),
}));

import type { NextFunction } from 'express';
import { findUserById } from '../../../repositories/userRepository.js';
import { isAdminEmail } from '../../../config/env.js';
import { adminMiddleware } from '../../../middleware/adminMiddleware.js';
import { asResponse, createMockRequest, createMockResponse } from '../controllers/httpMocks.js';

const mockedFindUser = findUserById as jest.MockedFunction<typeof findUserById>;
const mockedIsAdmin = isAdminEmail as jest.MockedFunction<typeof isAdminEmail>;

describe('adminMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows an allowlisted admin email', async () => {
    mockedFindUser.mockResolvedValue({
      id: 'user-1',
      email: 'founder@example.com',
      password_hash: 'hash',
      google_sub: null,
      email_verified: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
      password_reset_token_hash: null,
      password_reset_expires_at: null,
      created_at: new Date(),
    });
    mockedIsAdmin.mockReturnValue(true);
    const next = jest.fn() as NextFunction;

    await adminMiddleware(createMockRequest(), asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('forwards 401 when the session has no user id', async () => {
    const next = jest.fn() as NextFunction;

    await adminMiddleware(
      createMockRequest({ userId: undefined }),
      asResponse(createMockResponse()),
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('forwards 403 when the email is not an admin', async () => {
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
    mockedIsAdmin.mockReturnValue(false);
    const next = jest.fn() as NextFunction;

    await adminMiddleware(createMockRequest(), asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
