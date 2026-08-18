jest.mock('../../../services/authService.js', () => ({
  verifyAccessToken: jest.fn(),
}));

import type { NextFunction } from 'express';
import { JWT_COOKIE_NAME } from '../../../constants.js';
import { authMiddleware } from '../../../middleware/authMiddleware.js';
import { verifyAccessToken } from '../../../services/authService.js';
import { createMockRequest, createMockResponse, asResponse } from '../controllers/httpMocks.js';

const mockedVerify = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

describe('authMiddleware', () => {
  it('attaches userId from the HttpOnly cookie', () => {
    mockedVerify.mockReturnValue({ userId: 'user-1' });
    const req = createMockRequest({
      userId: undefined,
      cookies: { [JWT_COOKIE_NAME]: 'jwt-token' },
    });
    const next = jest.fn() as NextFunction;

    authMiddleware(req, asResponse(createMockResponse()), next);

    expect(req.userId).toBe('user-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards 401 when the cookie is missing', () => {
    const next = jest.fn() as NextFunction;

    authMiddleware(createMockRequest({ cookies: {} }), asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
