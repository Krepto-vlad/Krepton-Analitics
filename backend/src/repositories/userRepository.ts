import { pool } from '../config/db.js';
import type { UserRow } from '../types/auth.types.js';

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ?? null;
}

export async function findUserByGoogleSub(googleSub: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>('SELECT * FROM users WHERE google_sub = $1 LIMIT 1', [
    googleSub,
  ]);
  return result.rows[0] ?? null;
}

export async function findUserByVerificationTokenHash(tokenHash: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `SELECT * FROM users
     WHERE email_verification_token_hash = $1
       AND email_verification_expires_at IS NOT NULL
       AND email_verification_expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function createPasswordUser(
  email: string,
  passwordHash: string,
  verificationTokenHash: string,
  verificationExpiresAt: Date
): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (
       email,
       password_hash,
       email_verified,
       email_verification_token_hash,
       email_verification_expires_at
     ) VALUES ($1, $2, FALSE, $3, $4)
     RETURNING *`,
    [email, passwordHash, verificationTokenHash, verificationExpiresAt]
  );
  return result.rows[0];
}

export async function createGoogleUser(email: string, googleSub: string): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, google_sub, email_verified)
     VALUES ($1, NULL, $2, TRUE)
     RETURNING *`,
    [email, googleSub]
  );
  return result.rows[0];
}

export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string
): Promise<boolean> {
  const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function linkGoogleSubToUser(userId: string, googleSub: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users
     SET google_sub = $1,
         email_verified = TRUE,
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL
     WHERE id = $2`,
    [googleSub, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markEmailVerified(userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users
     SET email_verified = TRUE,
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL
     WHERE id = $1`,
    [userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setEmailVerificationToken(
  userId: string,
  verificationTokenHash: string,
  verificationExpiresAt: Date
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE users
     SET email_verification_token_hash = $1,
         email_verification_expires_at = $2
     WHERE id = $3`,
    [verificationTokenHash, verificationExpiresAt, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
