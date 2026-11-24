import { pool } from '../../config/db.js';
import { AI_FEATURES } from '../../constants.js';
import { insertAiUsageEvent, saveNewsSummaryCache } from '../../repositories/aiRepository.js';
import {
  upsertBillingCustomer,
  upsertAdminEntitlement,
} from '../../repositories/billingRepository.js';
import { upsertSnaptradeUser } from '../../repositories/snaptradeRepository.js';
import {
  clearPasswordResetToken,
  createGoogleUser,
  deleteUserById,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserByPasswordResetTokenHash,
  findUserByVerificationTokenHash,
  linkGoogleSubToUser,
  markEmailVerified,
  setEmailVerificationToken,
  setPasswordResetToken,
  updateUserAiPersonalDataEnabled,
  updateUserPasswordHash,
} from '../../repositories/userRepository.js';
import { MILLISECONDS_PER_HOUR, POSTGRES_ERROR_CODE } from './helpers/dbTestConstants.js';
import {
  buildUniqueEmail,
  captureDatabaseError,
  closeTestDatabasePool,
  createTestPortfolio,
  createTestUser,
  hashLabel,
  truncateAllTables,
} from './helpers/testDatabase.js';

const UNKNOWN_USER_ID = '00000000-0000-4000-8000-000000000000';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GOOGLE_SUB = 'google-subject-1';
const REPLACEMENT_PASSWORD_HASH = '$2b$10$replacementPasswordHashValue0000000000000000000000000';
const PADDLE_CUSTOMER_ID = 'ctm_integration_1';
const SNAPTRADE_USER_ID = 'snaptrade-user-1';
const SNAPTRADE_USER_SECRET = 'snaptrade-secret-1';
const NEWS_SUMMARY_DATE = '2026-01-15';

function inOneHour(): Date {
  return new Date(Date.now() + MILLISECONDS_PER_HOUR);
}

function oneHourAgo(): Date {
  return new Date(Date.now() - MILLISECONDS_PER_HOUR);
}

async function countRows(tableName: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${tableName}`
  );
  return Number(result.rows[0].count);
}

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('userRepository on PostgreSQL', () => {
  describe('creating and finding users', () => {
    it('stores a password user with safe defaults and finds it by email and id', async () => {
      const email = buildUniqueEmail();

      const created = await createTestUser(email);

      expect(created.id).toMatch(UUID_PATTERN);
      expect(created.email_verified).toBe(false);
      expect(created.ai_personal_data_enabled).toBe(true);
      expect(created.google_sub).toBeNull();
      expect(await findUserByEmail(email)).toEqual(created);
      expect(await findUserById(created.id)).toEqual(created);
    });

    it('returns null for an unknown email, id and Google subject', async () => {
      expect(await findUserByEmail('missing@krepton.test')).toBeNull();
      expect(await findUserById(UNKNOWN_USER_ID)).toBeNull();
      expect(await findUserByGoogleSub('missing-subject')).toBeNull();
    });

    it('rejects a second user with the same email', async () => {
      const email = buildUniqueEmail();
      await createTestUser(email);

      const error = await captureDatabaseError(createTestUser(email));

      expect(error.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
    });

    it('stores a Google user as verified and without a password', async () => {
      const created = await createGoogleUser(buildUniqueEmail(), GOOGLE_SUB);

      expect(created.password_hash).toBeNull();
      expect(created.email_verified).toBe(true);
      expect(await findUserByGoogleSub(GOOGLE_SUB)).toEqual(created);
    });

    it('rejects a second user with the same Google subject', async () => {
      await createGoogleUser(buildUniqueEmail(), GOOGLE_SUB);

      const error = await captureDatabaseError(createGoogleUser(buildUniqueEmail(), GOOGLE_SUB));

      expect(error.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
    });
  });

  describe('email verification', () => {
    it('finds a user by a verification token hash only while it has not expired', async () => {
      const user = await createTestUser();
      const validHash = hashLabel('valid-token');
      const expiredHash = hashLabel('expired-token');

      await setEmailVerificationToken(user.id, validHash, inOneHour());
      expect((await findUserByVerificationTokenHash(validHash))?.id).toBe(user.id);

      await setEmailVerificationToken(user.id, expiredHash, oneHourAgo());
      expect(await findUserByVerificationTokenHash(expiredHash)).toBeNull();
      expect(await findUserByVerificationTokenHash(validHash)).toBeNull();
    });

    it('marks the email verified and clears the token', async () => {
      const user = await createTestUser();
      const tokenHash = hashLabel('verification');
      await setEmailVerificationToken(user.id, tokenHash, inOneHour());

      expect(await markEmailVerified(user.id)).toBe(true);

      const reloaded = await findUserById(user.id);
      expect(reloaded?.email_verified).toBe(true);
      expect(reloaded?.email_verification_token_hash).toBeNull();
      expect(reloaded?.email_verification_expires_at).toBeNull();
      expect(await findUserByVerificationTokenHash(tokenHash)).toBeNull();
    });

    it('reports false when the user does not exist', async () => {
      expect(await markEmailVerified(UNKNOWN_USER_ID)).toBe(false);
      expect(await setEmailVerificationToken(UNKNOWN_USER_ID, hashLabel('x'), inOneHour())).toBe(
        false
      );
    });
  });

  describe('password reset', () => {
    it('finds a user by an unexpired reset token and ignores an expired one', async () => {
      const user = await createTestUser();
      const validHash = hashLabel('reset-valid');
      const expiredHash = hashLabel('reset-expired');

      expect(await setPasswordResetToken(user.id, validHash, inOneHour())).toBe(true);
      expect((await findUserByPasswordResetTokenHash(validHash))?.id).toBe(user.id);

      await setPasswordResetToken(user.id, expiredHash, oneHourAgo());
      expect(await findUserByPasswordResetTokenHash(expiredHash)).toBeNull();
    });

    it('replaces the password hash and invalidates the reset token in one update', async () => {
      const user = await createTestUser();
      const tokenHash = hashLabel('reset-then-change');
      await setPasswordResetToken(user.id, tokenHash, inOneHour());

      expect(await updateUserPasswordHash(user.id, REPLACEMENT_PASSWORD_HASH)).toBe(true);

      const reloaded = await findUserById(user.id);
      expect(reloaded?.password_hash).toBe(REPLACEMENT_PASSWORD_HASH);
      expect(reloaded?.password_reset_token_hash).toBeNull();
      expect(await findUserByPasswordResetTokenHash(tokenHash)).toBeNull();
    });

    it('clears a reset token without touching the password', async () => {
      const user = await createTestUser();
      await setPasswordResetToken(user.id, hashLabel('reset-clear'), inOneHour());

      expect(await clearPasswordResetToken(user.id)).toBe(true);

      const reloaded = await findUserById(user.id);
      expect(reloaded?.password_reset_token_hash).toBeNull();
      expect(reloaded?.password_hash).toBe(user.password_hash);
    });

    it('reports false for an unknown user', async () => {
      expect(await updateUserPasswordHash(UNKNOWN_USER_ID, REPLACEMENT_PASSWORD_HASH)).toBe(false);
      expect(await setPasswordResetToken(UNKNOWN_USER_ID, hashLabel('x'), inOneHour())).toBe(false);
      expect(await clearPasswordResetToken(UNKNOWN_USER_ID)).toBe(false);
    });
  });

  describe('linking a Google identity', () => {
    it('attaches the subject, verifies the email and clears the verification token', async () => {
      const user = await createTestUser();
      await setEmailVerificationToken(user.id, hashLabel('link'), inOneHour());

      expect(await linkGoogleSubToUser(user.id, GOOGLE_SUB)).toBe(true);

      const reloaded = await findUserById(user.id);
      expect(reloaded?.google_sub).toBe(GOOGLE_SUB);
      expect(reloaded?.email_verified).toBe(true);
      expect(reloaded?.email_verification_token_hash).toBeNull();
      expect(reloaded?.password_hash).toBe(user.password_hash);
    });

    it('reports false for an unknown user', async () => {
      expect(await linkGoogleSubToUser(UNKNOWN_USER_ID, GOOGLE_SUB)).toBe(false);
    });
  });

  describe('AI personal-data preference', () => {
    it('stores the preference and returns the updated row', async () => {
      const user = await createTestUser();

      const disabled = await updateUserAiPersonalDataEnabled(user.id, false);
      expect(disabled?.ai_personal_data_enabled).toBe(false);

      const enabled = await updateUserAiPersonalDataEnabled(user.id, true);
      expect(enabled?.ai_personal_data_enabled).toBe(true);
    });

    it('returns null for an unknown user', async () => {
      expect(await updateUserAiPersonalDataEnabled(UNKNOWN_USER_ID, false)).toBeNull();
    });
  });

  describe('deleting an account', () => {
    it('removes the user and every user-owned row but keeps the anonymous portfolio', async () => {
      const user = await createTestUser();
      await insertAiUsageEvent(user.id, AI_FEATURES[0]);
      await saveNewsSummaryCache({
        userId: user.id,
        tickersKey: 'AAPL',
        summaryDate: NEWS_SUMMARY_DATE,
        tickers: ['AAPL'],
        summaryPayload: { holdingInsights: [], marketDrivers: [] },
      });
      await upsertBillingCustomer(user.id, PADDLE_CUSTOMER_ID);
      await upsertAdminEntitlement(user.id, inOneHour());
      await upsertSnaptradeUser(user.id, SNAPTRADE_USER_ID, SNAPTRADE_USER_SECRET);
      await createTestPortfolio('anonymous-owner');

      expect(await deleteUserById(user.id)).toBe(true);

      expect(await findUserById(user.id)).toBeNull();
      expect(await countRows('ai_usage_events')).toBe(0);
      expect(await countRows('ai_news_summaries')).toBe(0);
      expect(await countRows('billing_customers')).toBe(0);
      expect(await countRows('billing_entitlements')).toBe(0);
      expect(await countRows('snaptrade_users')).toBe(0);
      expect(await countRows('portfolio_accounts')).toBe(1);
    });

    it('reports false when the user does not exist', async () => {
      expect(await deleteUserById(UNKNOWN_USER_ID)).toBe(false);
    });
  });
});
