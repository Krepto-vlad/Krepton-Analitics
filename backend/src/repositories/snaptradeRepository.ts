import { pool } from '../config/db.js';
import type { SnaptradeUserRow } from '../types/snaptrade.types.js';

export async function findSnaptradeUserByUserId(userId: string): Promise<SnaptradeUserRow | null> {
  const result = await pool.query<SnaptradeUserRow>(
    `SELECT user_id, snaptrade_user_id, user_secret, created_at, updated_at
     FROM snaptrade_users
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function upsertSnaptradeUser(
  userId: string,
  snaptradeUserId: string,
  userSecret: string
): Promise<SnaptradeUserRow> {
  const result = await pool.query<SnaptradeUserRow>(
    `INSERT INTO snaptrade_users (user_id, snaptrade_user_id, user_secret)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE
       SET snaptrade_user_id = EXCLUDED.snaptrade_user_id,
           user_secret = EXCLUDED.user_secret,
           updated_at = NOW()
     RETURNING user_id, snaptrade_user_id, user_secret, created_at, updated_at`,
    [userId, snaptradeUserId, userSecret]
  );
  return result.rows[0];
}

export async function deleteSnaptradeUserByUserId(userId: string): Promise<void> {
  await pool.query('DELETE FROM snaptrade_users WHERE user_id = $1', [userId]);
}
