import { PASSWORD_RESET_REQUEST_GENERIC_MESSAGE, PASSWORD_MIN_LENGTH } from '../../../constants.js';

jest.mock('../../../repositories/userRepository.js', () => ({
  findUserByEmail: jest.fn(),
  findUserByPasswordResetTokenHash: jest.fn(),
  setPasswordResetToken: jest.fn().mockResolvedValue(true),
  updateUserPasswordHash: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../services/emailService.js', () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue(undefined),
  sendGoogleOnlySignInHint: jest.fn().mockResolvedValue(undefined),
}));

import {
  findUserByEmail,
  findUserByPasswordResetTokenHash,
  setPasswordResetToken,
  updateUserPasswordHash,
} from '../../../repositories/userRepository.js';
import { sendGoogleOnlySignInHint, sendPasswordResetLink } from '../../../services/emailService.js';
import { requestPasswordReset, resetPasswordWithToken } from '../../../services/authService.js';
import type { UserRow } from '../../../types/auth.types.js';

const mockedFindByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
const mockedFindByResetHash = findUserByPasswordResetTokenHash as jest.MockedFunction<
  typeof findUserByPasswordResetTokenHash
>;
const mockedSetResetToken = setPasswordResetToken as jest.MockedFunction<
  typeof setPasswordResetToken
>;
const mockedUpdatePassword = updateUserPasswordHash as jest.MockedFunction<
  typeof updateUserPasswordHash
>;
const mockedSendReset = sendPasswordResetLink as jest.MockedFunction<typeof sendPasswordResetLink>;
const mockedSendGoogleHint = sendGoogleOnlySignInHint as jest.MockedFunction<
  typeof sendGoogleOnlySignInHint
>;

function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'investor@example.com',
    password_hash: 'hash',
    google_sub: null,
    email_verified: true,
    email_verification_token_hash: null,
    email_verification_expires_at: null,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
    ai_personal_data_enabled: true,
    created_at: new Date(),
    ...overrides,
  };
}

describe('password reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('returns generic message when email is unknown', async () => {
      mockedFindByEmail.mockResolvedValue(null);

      const result = await requestPasswordReset('missing@example.com');

      expect(result.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);
      expect(mockedSetResetToken).not.toHaveBeenCalled();
      expect(mockedSendReset).not.toHaveBeenCalled();
      expect(mockedSendGoogleHint).not.toHaveBeenCalled();
    });

    it('issues reset token for verified password users', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser());

      const result = await requestPasswordReset('investor@example.com');

      expect(result.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);
      expect(mockedSetResetToken).toHaveBeenCalledTimes(1);
      expect(mockedSendReset).toHaveBeenCalledTimes(1);
      expect(mockedSendGoogleHint).not.toHaveBeenCalled();
    });

    it('sends Google-only hint without setting reset hash', async () => {
      mockedFindByEmail.mockResolvedValue(
        buildUser({
          password_hash: null,
          google_sub: 'google-sub-1',
        })
      );

      const result = await requestPasswordReset('investor@example.com');

      expect(result.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);
      expect(mockedSetResetToken).not.toHaveBeenCalled();
      expect(mockedSendReset).not.toHaveBeenCalled();
      expect(mockedSendGoogleHint).toHaveBeenCalledWith('investor@example.com');
    });

    it('does not issue reset for unverified password users', async () => {
      mockedFindByEmail.mockResolvedValue(buildUser({ email_verified: false }));

      const result = await requestPasswordReset('investor@example.com');

      expect(result.message).toBe(PASSWORD_RESET_REQUEST_GENERIC_MESSAGE);
      expect(mockedSetResetToken).not.toHaveBeenCalled();
      expect(mockedSendReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPasswordWithToken', () => {
    it('rejects invalid or expired tokens', async () => {
      mockedFindByResetHash.mockResolvedValue(null);

      await expect(resetPasswordWithToken('bad-token', 'ValidPass1!')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockedUpdatePassword).not.toHaveBeenCalled();
    });

    it('rejects weak passwords', async () => {
      mockedFindByResetHash.mockResolvedValue(buildUser());

      await expect(resetPasswordWithToken('token', 'short')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockedUpdatePassword).not.toHaveBeenCalled();
    });

    it('updates password for a valid token', async () => {
      mockedFindByResetHash.mockResolvedValue(buildUser());

      const strongPassword = `${'A'.repeat(PASSWORD_MIN_LENGTH - 3)}1!x`;
      const result = await resetPasswordWithToken('valid-token', strongPassword);

      expect(result.message).toContain('Password updated successfully');
      expect(mockedUpdatePassword).toHaveBeenCalledWith('user-1', expect.any(String));
    });
  });
});
