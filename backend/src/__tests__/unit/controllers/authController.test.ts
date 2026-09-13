jest.mock('../../../services/authService.js', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  loginWithGoogleIdToken: jest.fn(),
  getUserById: jest.fn(),
  changeUserPassword: jest.fn(),
  deleteUserAccount: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPasswordWithToken: jest.fn(),
  signAccessToken: jest.fn(),
  withSessionExpiry: jest.fn((profile) => ({
    ...profile,
    sessionExpiresAt: '2026-01-01T00:15:00.000Z',
  })),
  extendAccessSession: jest.fn(),
  verifyEmailWithToken: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));

import { JWT_COOKIE_NAME } from '../../../constants.js';
import { createFreeSubscriptionSummary } from '../../../types/billing.types.js';
import {
  changePassword,
  deleteAccount,
  extendSession,
  forgotPassword,
  getMe,
  googleLogin,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../../../controllers/authController.js';
import {
  changeUserPassword,
  deleteUserAccount,
  extendAccessSession,
  getUserById,
  loginUser,
  loginWithGoogleIdToken,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPasswordWithToken,
  signAccessToken,
  withSessionExpiry,
  verifyEmailWithToken,
} from '../../../services/authService.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedRegister = registerUser as jest.MockedFunction<typeof registerUser>;
const mockedLogin = loginUser as jest.MockedFunction<typeof loginUser>;
const mockedGoogle = loginWithGoogleIdToken as jest.MockedFunction<typeof loginWithGoogleIdToken>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedChangePassword = changeUserPassword as jest.MockedFunction<typeof changeUserPassword>;
const mockedDelete = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;
const mockedExtend = extendAccessSession as jest.MockedFunction<typeof extendAccessSession>;
const mockedForgot = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>;
const mockedReset = resetPasswordWithToken as jest.MockedFunction<typeof resetPasswordWithToken>;
const mockedSign = signAccessToken as jest.MockedFunction<typeof signAccessToken>;
const mockedWithSessionExpiry = withSessionExpiry as jest.MockedFunction<typeof withSessionExpiry>;
const mockedVerifyEmail = verifyEmailWithToken as jest.MockedFunction<typeof verifyEmailWithToken>;
const mockedResend = resendVerificationEmail as jest.MockedFunction<typeof resendVerificationEmail>;

const user = {
  id: 'user-1',
  email: 'user@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  isAdmin: false,
  subscription: createFreeSubscriptionSummary(),
};

const userWithSession = {
  ...user,
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSign.mockReturnValue('jwt-token');
    mockedWithSessionExpiry.mockImplementation((profile) => ({
      ...profile,
      sessionExpiresAt: '2026-01-01T00:15:00.000Z',
    }));
  });

  it('registers with a 201 payload', async () => {
    mockedRegister.mockResolvedValue({ email: user.email, message: 'Check inbox' });
    const res = createMockResponse();

    await register(
      createMockRequest({ body: { email: 'User@Example.com', password: 'secret' } }),
      asResponse(res)
    );

    expect(mockedRegister).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects register without email or password', async () => {
    await expect(
      register(createMockRequest({ body: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('sets an HttpOnly cookie on login', async () => {
    mockedLogin.mockResolvedValue(user);
    const res = createMockResponse();

    await login(
      createMockRequest({ body: { email: 'user@example.com', password: 'secret' } }),
      asResponse(res)
    );

    expect(res.cookie).toHaveBeenCalledWith(
      JWT_COOKIE_NAME,
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(mockedWithSessionExpiry).toHaveBeenCalledWith(user, 'jwt-token');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: userWithSession });
  });

  it('rejects login without credentials', async () => {
    await expect(
      login(createMockRequest({ body: { email: '' } }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('logs in with a Google id token', async () => {
    mockedGoogle.mockResolvedValue(user);
    const res = createMockResponse();

    await googleLogin(createMockRequest({ body: { idToken: 'google' } }), asResponse(res));

    expect(res.cookie).toHaveBeenCalled();
  });

  it('verifies email and sets the cookie', async () => {
    mockedVerifyEmail.mockResolvedValue(user);
    const res = createMockResponse();

    await verifyEmail(createMockRequest({ body: { token: 'tok' } }), asResponse(res));

    expect(mockedVerifyEmail).toHaveBeenCalledWith('tok');
    expect(res.cookie).toHaveBeenCalled();
  });

  it('resends verification mail', async () => {
    mockedResend.mockResolvedValue({ email: user.email, message: 'sent' });
    const res = createMockResponse();

    await resendVerification(
      createMockRequest({ body: { email: 'User@Example.com' } }),
      asResponse(res)
    );

    expect(mockedResend).toHaveBeenCalledWith('user@example.com');
  });

  it('rejects resend without email', async () => {
    await expect(
      resendVerification(createMockRequest({ body: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('clears the auth cookie on logout', () => {
    const res = createMockResponse();
    logout(createMockRequest(), asResponse(res));
    expect(res.clearCookie).toHaveBeenCalledWith(JWT_COOKIE_NAME, expect.any(Object));
  });

  it('returns the current user', async () => {
    mockedGetUser.mockResolvedValue(user);
    const res = createMockResponse();

    await getMe(createMockRequest({ accessToken: 'jwt-token' }), asResponse(res));

    expect(mockedWithSessionExpiry).toHaveBeenCalledWith(user, 'jwt-token');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: userWithSession });
  });

  it('rejects getMe without an access token', async () => {
    mockedGetUser.mockResolvedValue(user);

    await expect(
      getMe(createMockRequest({ accessToken: undefined }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rejects getMe without a user id', async () => {
    await expect(
      getMe(createMockRequest({ userId: undefined }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('rewrites the auth cookie when the session is due for renewal', async () => {
    mockedExtend.mockReturnValue({
      token: 'renewed-jwt',
      sessionExpiresAt: '2026-01-01T00:22:30.000Z',
      renewed: true,
    });
    const res = createMockResponse();

    await extendSession(createMockRequest({ accessToken: 'jwt-token' }), asResponse(res));

    expect(mockedExtend).toHaveBeenCalledWith('user-1', 'jwt-token');
    expect(res.cookie).toHaveBeenCalledWith(
      JWT_COOKIE_NAME,
      'renewed-jwt',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { sessionExpiresAt: '2026-01-01T00:22:30.000Z', renewed: true },
    });
  });

  it('returns the current expiry without rewriting the cookie when renewal is not due', async () => {
    mockedExtend.mockReturnValue({
      token: 'jwt-token',
      sessionExpiresAt: '2026-01-01T00:15:00.000Z',
      renewed: false,
    });
    const res = createMockResponse();

    await extendSession(createMockRequest({ accessToken: 'jwt-token' }), asResponse(res));

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { sessionExpiresAt: '2026-01-01T00:15:00.000Z', renewed: false },
    });
  });

  it('changes password using currentPassword as step-up', async () => {
    mockedChangePassword.mockResolvedValue(undefined);
    const res = createMockResponse();

    await changePassword(
      createMockRequest({ body: { newPassword: 'next', currentPassword: 'old' } }),
      asResponse(res)
    );

    expect(mockedChangePassword).toHaveBeenCalledWith('user-1', 'next', {
      password: 'old',
      googleIdToken: undefined,
    });
  });

  it('rejects changePassword without a string newPassword', async () => {
    await expect(
      changePassword(
        createMockRequest({ body: { newPassword: 1 } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('deletes the account and clears the cookie', async () => {
    mockedDelete.mockResolvedValue(undefined);
    const res = createMockResponse();

    await deleteAccount(
      createMockRequest({ body: { confirm: 'DELETE', password: 'secret' } }),
      asResponse(res)
    );

    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('forwards forgot and reset password', async () => {
    mockedForgot.mockResolvedValue({ message: 'ok' });
    mockedReset.mockResolvedValue({ message: 'ok' });
    const res = createMockResponse();

    await forgotPassword(createMockRequest({ body: { email: 'a@b.c' } }), asResponse(res));
    await resetPassword(
      createMockRequest({ body: { token: 't', newPassword: 'n' } }),
      asResponse(res)
    );

    expect(mockedForgot).toHaveBeenCalledWith('a@b.c');
    expect(mockedReset).toHaveBeenCalledWith('t', 'n');
  });
});
