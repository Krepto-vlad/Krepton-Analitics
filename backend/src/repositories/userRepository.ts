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

export async function createUser(email: string, passwordHash: string): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email, passwordHash]
  );
  return result.rows[0];
}
