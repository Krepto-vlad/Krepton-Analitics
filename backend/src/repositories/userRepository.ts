import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../db/schema.js';
import type { UserRow } from '../types/auth.types.js';

function toUserRow(row: typeof users.$inferSelect): UserRow {
  return row;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function findUserByGoogleSub(googleSub: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.google_sub, googleSub)).limit(1);
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function findUserByVerificationTokenHash(tokenHash: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email_verification_token_hash, tokenHash),
        isNotNull(users.email_verification_expires_at),
        gt(users.email_verification_expires_at, new Date())
      )
    )
    .limit(1);
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function createPasswordUser(
  email: string,
  passwordHash: string,
  verificationTokenHash: string,
  verificationExpiresAt: Date
): Promise<UserRow> {
  const rows = await db
    .insert(users)
    .values({
      email,
      password_hash: passwordHash,
      email_verified: false,
      email_verification_token_hash: verificationTokenHash,
      email_verification_expires_at: verificationExpiresAt,
    })
    .returning();
  return toUserRow(rows[0]);
}

export async function createGoogleUser(email: string, googleSub: string): Promise<UserRow> {
  const rows = await db
    .insert(users)
    .values({
      email,
      password_hash: null,
      google_sub: googleSub,
      email_verified: true,
    })
    .returning();
  return toUserRow(rows[0]);
}

export async function updateUserAiPersonalDataEnabled(
  userId: string,
  enabled: boolean
): Promise<UserRow | null> {
  const rows = await db
    .update(users)
    .set({ ai_personal_data_enabled: enabled })
    .where(eq(users.id, userId))
    .returning();
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string
): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      password_hash: passwordHash,
      password_reset_token_hash: null,
      password_reset_expires_at: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function setPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: expiresAt,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function findUserByPasswordResetTokenHash(tokenHash: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.password_reset_token_hash, tokenHash),
        isNotNull(users.password_reset_expires_at),
        gt(users.password_reset_expires_at, new Date())
      )
    )
    .limit(1);
  return rows[0] ? toUserRow(rows[0]) : null;
}

export async function clearPasswordResetToken(userId: string): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      password_reset_token_hash: null,
      password_reset_expires_at: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function linkGoogleSubToUser(userId: string, googleSub: string): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      google_sub: googleSub,
      email_verified: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function markEmailVerified(userId: string): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      email_verified: true,
      email_verification_token_hash: null,
      email_verification_expires_at: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function setEmailVerificationToken(
  userId: string,
  verificationTokenHash: string,
  verificationExpiresAt: Date
): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      email_verification_token_hash: verificationTokenHash,
      email_verification_expires_at: verificationExpiresAt,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const rows = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  return rows.length > 0;
}
