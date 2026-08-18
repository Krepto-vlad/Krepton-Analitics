const mockVerifyIdToken = jest.fn();

jest.mock('../../../config/env.js', () => ({
  env: { googleClientId: 'google-client-id' },
  isGoogleAuthConfigured: true,
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

import { verifyGoogleIdToken } from '../../../services/googleAuthService.js';

describe('googleAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a missing token', async () => {
    await expect(verifyGoogleIdToken('')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an invalid Google token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

    await expect(verifyGoogleIdToken('token')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a payload without a verified email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-1', email: 'user@example.com', email_verified: false }),
    });

    await expect(verifyGoogleIdToken('token')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns the normalized Google identity', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-1', email: 'User@Example.com', email_verified: true }),
    });

    await expect(verifyGoogleIdToken(' token ')).resolves.toEqual({
      googleSub: 'google-1',
      email: 'user@example.com',
      emailVerified: true,
    });
  });
});
