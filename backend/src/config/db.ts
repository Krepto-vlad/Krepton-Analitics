import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('[DB] Connection OK');
}
