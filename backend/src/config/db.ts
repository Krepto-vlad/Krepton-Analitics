import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENT } from '../constants.js';
import * as schema from '../db/schema.js';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

pool.on('error', (err) => {
  logger.error({ event: LOG_EVENT.DB_POOL_ERROR, err }, 'Unexpected database pool error');
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info({ event: LOG_EVENT.DB_CONNECTED }, 'Database connection OK');
  } finally {
    client.release();
  }
}
