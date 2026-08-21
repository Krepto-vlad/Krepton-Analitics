import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ACCOUNT_DELETE_CONFIRMATION, PASSWORD_MIN_LENGTH } from '../../../constants.js';
import { env } from '../../../config/env.js';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('../../../repositories/userRepository.js', () => ({
  createGoogleUser: jest.fn(),
  createPasswordUser: jest.fn(),
  deleteUserById: jest.fn(),
  findUserByEmail: jest.fn(),
  findUserByGoogleSub: jest.fn(),
  findUserById: jest.fn(),
  findUserByPasswordResetTokenHash: jest.fn(),
  findUserByVerificationTokenHash: jest.fn(),
  linkGoogleSubToUser: jest.fn(),
  markEmailVerified: jest.fn(),
  setEmailVerificationToken: jest.fn(),
  setPasswordResetToken: jest.fn(),
  updateUserPasswordHash: jest.fn(),
}));

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  deletePortfolioAccountById: jest.fn(),
  findPortfolioAccountIdByOwnerToken: jest.fn(),
}));

jest.mock('../../../services/emailService.js', () => ({
  sendEmailVerificationLink: jest.fn().mockResolvedValue(undefined),
  sendGoogleOnlySignInHint: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetLink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/googleAuthService.js', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

import {
  createGoogleUser,
  createPasswordUser,
  deleteUserById,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserByVerificationTokenHash,
  linkGoogleSubToUser,
  markEmailVerified,
  setEmailVerificationToken,
} from '../../../repositories/userRepository.js';
import {
  deletePortfolioAccountById,
  findPortfolioAccountIdByOwnerToken,
} from '../../../repositories/portfolioRepository.js';
import { sendEmailVerificationLink } from '../../../services/emailService.js';
import { verifyGoogleIdToken } from '../../../services/googleAuthService.js';
import {
  changeUserPassword,
  deleteUserAccount,
  getUserById,
  loginUser,
  loginWithGoogleIdToken,
  registerUser,
  resendVerificationEmail,
  signAccessToken,
  verifyAccessToken,
  withSessionExpiry,
  shouldRenewAccessToken,
  extendAccessSession,
  verifyEmailWithToken,
  verifySensitiveAction,
} from '../../../services/authService.js';
import type { UserRow } from '../../../types/auth.types.js';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedFindByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
const mockedCreatePasswordUser = createPasswordUser as jest.MockedFunction<
  typeof createPasswordUser
>;
const mockedSendVerification = sendEmailVerificationLink as jest.MockedFunction<
  typeof sendEmailVerificationLink
>;
const mockedFindByVerificationHash = findUserByVerificationTokenHash as jest.MockedFunction<
  typeof findUserByVerificationTokenHash
>;
const mockedMarkVerified = markEmailVerified as jest.MockedFunction<typeof markEmailVerified>;
const mockedFindById = findUserById as jest.MockedFunction<typeof findUserById>;
const mockedSetVerificationToken = setEmailVerificationToken as jest.MockedFunction<
  typeof setEmailVerificationToken
>;
const mockedFindByGoogleSub = findUserByGoogleSub as jest.MockedFunction<
  typeof findUserByGoogleSub
>;
const mockedVerifyGoogle = verifyGoogleIdToken as jest.MockedFunction<typeof verifyGoogleIdToken>;
const mockedCreateGoogleUser = createGoogleUser as jest.MockedFunction<typeof createGoogleUser>;
const mockedLinkGoogle = linkGoogleSubToUser as jest.MockedFunction<typeof linkGoogleSubToUser>;
const mockedFindPortfolio = findPortfolioAccountIdByOwnerToken as jest.MockedFunction<
  typeof findPortfolioAccountIdByOwnerToken
>;
const mockedDeletePortfolio = deletePortfolioAccountById as jest.MockedFunction<
  typeof deletePortfolioAccountById
>;
const mockedDeleteUser = deleteUserById as jest.MockedFunction<typeof deleteUserById>;

const STRONG_PASSWORD = `${'A'.repeat(PASSWORD_MIN_LENGTH - 3)}1!x`;

function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'investor@example.com',
    password_hash: 'hashed-password',
    google_sub: null,
    email_verified: true,
    email_verification_token_hash: null,
    email_verification_expires_at: null,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
  });

  describe('registerUser', () => {
    it('rejects a duplicate email', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser());

      await expect(registerUser('investor@example.com', STRONG_PASSWORD)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });
      expect(mockedCreatePasswordUser).not.toHaveBeenCalled();
    });

    it('rejects Google-only accounts with a sign-in hint', async () => {
      mockedFindByEmail.mockResolvedValue(
        buildUser({ password_hash: null, google_sub: 'google-sub-1' })
      );

      await expect(registerUser('investor@example.com', STRONG_PASSWORD)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/Google sign-in/),
      });
    });

    it('rejects a weak password before hashing', async () => {
      mockedFindByEmail.mockResolvedValue(null);

      await expect(registerUser('new@example.com', 'short')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });

    it('creates a password user and sends a verification email', async () => {
      mockedFindByEmail.mockResolvedValue(null);
      mockedCreatePasswordUser.mockResolvedValue(buildUser({ email_verified: false }));

      const result = await registerUser('investor@example.com', STRONG_PASSWORD);

      expect(result.email).toBe('investor@example.com');
      expect(result.message).toMatch(/verification link/i);
      expect(mockedCreatePasswordUser).toHaveBeenCalledWith(
        'investor@example.com',
        'hashed-password',
        expect.any(String),
        expect.any(Date)
      );
      expect(mockedSendVerification).toHaveBeenCalledWith(
        'investor@example.com',
        expect.any(String)
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('returns a generic message and does not enumerate missing accounts', async () => {
      mockedFindByEmail.mockResolvedValue(null);

      const result = await resendVerificationEmail('missing@example.com');

      expect(result.message).toMatch(/If an unverified account exists/);
      expect(mockedSetVerificationToken).not.toHaveBeenCalled();
      expect(mockedSendVerification).not.toHaveBeenCalled();
    });

    it('issues a new token for an unverified password user', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser({ email_verified: false }));

      await resendVerificationEmail('investor@example.com');

      expect(mockedSetVerificationToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date)
      );
      expect(mockedSendVerification).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyEmailWithToken', () => {
    it('rejects an empty token', async () => {
      await expect(verifyEmailWithToken('')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects an unknown token', async () => {
      mockedFindByVerificationHash.mockResolvedValue(null);

      await expect(verifyEmailWithToken('deadbeef')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('marks the user verified', async () => {
      mockedFindByVerificationHash.mockResolvedValue(buildUser({ email_verified: false }));
      mockedFindById.mockResolvedValue(buildUser({ email_verified: true }));

      const user = await verifyEmailWithToken('valid-token');

      expect(mockedMarkVerified).toHaveBeenCalledWith('user-1');
      expect(user.emailVerified).toBe(true);
      expect(user.hasPassword).toBe(true);
    });
  });

  describe('loginUser', () => {
    it('rejects unknown credentials without leaking which field failed', async () => {
      mockedFindByEmail.mockResolvedValue(null);

      await expect(loginUser('missing@example.com', STRONG_PASSWORD)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('rejects a wrong password', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(loginUser('investor@example.com', STRONG_PASSWORD)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('rejects an unverified password user', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser({ email_verified: false }));
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(loginUser('investor@example.com', STRONG_PASSWORD)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('returns the auth user when email and password match', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const user = await loginUser('investor@example.com', STRONG_PASSWORD);

      expect(user).toEqual({
        id: 'user-1',
        email: 'investor@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: false,
      });
    });
  });

  describe('loginWithGoogleIdToken', () => {
    const googleIdentity = {
      googleSub: 'google-sub-1',
      email: 'investor@example.com',
      emailVerified: true,
    };

    it('creates a Google user when neither sub nor email exists', async () => {
      mockedVerifyGoogle.mockResolvedValue(googleIdentity);
      mockedFindByGoogleSub.mockResolvedValue(null);
      mockedFindByEmail.mockResolvedValue(null);
      mockedCreateGoogleUser.mockResolvedValue(
        buildUser({ password_hash: null, google_sub: 'google-sub-1' })
      );

      const user = await loginWithGoogleIdToken('id-token');

      expect(mockedCreateGoogleUser).toHaveBeenCalledWith('investor@example.com', 'google-sub-1');
      expect(user.hasGoogle).toBe(true);
      expect(user.hasPassword).toBe(false);
    });

    it('links Google to an existing email account', async () => {
      mockedVerifyGoogle.mockResolvedValue(googleIdentity);
      mockedFindByGoogleSub.mockResolvedValue(null);
      mockedFindByEmail.mockResolvedValue(buildUser({ google_sub: null }));
      mockedFindById.mockResolvedValue(buildUser({ google_sub: 'google-sub-1' }));

      const user = await loginWithGoogleIdToken('id-token');

      expect(mockedLinkGoogle).toHaveBeenCalledWith('user-1', 'google-sub-1');
      expect(user.hasGoogle).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('throws 401 when the user is missing', async () => {
      mockedFindById.mockResolvedValue(null);

      await expect(getUserById('missing')).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('verifySensitiveAction / changeUserPassword', () => {
    it('requires exactly one of password or googleIdToken', async () => {
      mockedFindById.mockResolvedValue(buildUser());

      await expect(verifySensitiveAction('user-1', {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects changing to the same password', async () => {
      mockedFindById.mockResolvedValue(buildUser());

      await expect(
        changeUserPassword('user-1', STRONG_PASSWORD, { password: STRONG_PASSWORD })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/different/) });
    });
  });

  describe('deleteUserAccount', () => {
    it('rejects the wrong confirmation phrase', async () => {
      await expect(
        deleteUserAccount('user-1', 'delete', { password: STRONG_PASSWORD })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deletes the HMAC portfolio then the user after step-up', async () => {
      mockedFindById.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedFindPortfolio.mockResolvedValue('portfolio-1');
      mockedDeleteUser.mockResolvedValue(true);

      await deleteUserAccount('user-1', ACCOUNT_DELETE_CONFIRMATION, {
        password: STRONG_PASSWORD,
      });

      expect(mockedDeletePortfolio).toHaveBeenCalledWith('portfolio-1');
      expect(mockedDeleteUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('access tokens', () => {
    it('signs and verifies a JWT for the user id', () => {
      const token = signAccessToken('user-1');
      expect(verifyAccessToken(token)).toEqual({
        userId: 'user-1',
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });

    it('rejects a malformed token', () => {
      expect(() => verifyAccessToken('not-a-jwt')).toThrow(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it('attaches sessionExpiresAt from the access token exp', () => {
      const token = signAccessToken('user-1');
      const profile = {
        id: 'user-1',
        email: 'investor@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: false,
      };
      const payload = verifyAccessToken(token) as unknown as { exp: number };

      expect(withSessionExpiry(profile, token).sessionExpiresAt).toBe(
        new Date(payload.exp * 1000).toISOString()
      );
    });

    it('does not renew a freshly issued full-lifetime token', () => {
      expect(shouldRenewAccessToken(signAccessToken('user-1'))).toBe(false);
    });

    it('renews when remaining lifetime is at most half of the access TTL', () => {
      const shortLivedToken = jwt.sign({ userId: 'user-1' }, env.jwtSecret, { expiresIn: '1m' });
      expect(shouldRenewAccessToken(shortLivedToken)).toBe(true);
    });

    it('issues a new cookie token only when renewal is due', () => {
      const freshToken = signAccessToken('user-1');
      expect(extendAccessSession('user-1', freshToken).renewed).toBe(false);

      const shortLivedToken = jwt.sign({ userId: 'user-1' }, env.jwtSecret, { expiresIn: '1m' });
      const extension = extendAccessSession('user-1', shortLivedToken);
      expect(extension.renewed).toBe(true);
      expect(extension.token).not.toBe(shortLivedToken);
      expect(shouldRenewAccessToken(extension.token)).toBe(false);
    });
  });
});
