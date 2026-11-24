import { createHash } from 'node:crypto';
import { pool } from '../../../config/db.js';
import { createPasswordUser } from '../../../repositories/userRepository.js';
import {
  findOrCreatePortfolioAccount,
  upsertPosition,
} from '../../../repositories/portfolioRepository.js';
import type { AddPositionDto, PositionRow } from '../../../types/portfolio.types.js';
import type { UserRow } from '../../../types/auth.types.js';
import {
  ISO_DATE_LENGTH,
  MIGRATIONS_TABLE_NAME,
  MILLISECONDS_PER_HOUR,
  TEST_COMPANY_NAME,
  TEST_PASSWORD_HASH,
  TEST_USD,
} from './dbTestConstants.js';

export interface CapturedDatabaseError {
  code?: string;
  constraint?: string;
}

interface PostgresErrorShape {
  code?: string;
  constraint?: string;
  cause?: unknown;
}

function isPostgresErrorShape(value: unknown): value is PostgresErrorShape {
  return typeof value === 'object' && value !== null;
}

/** Drizzle wraps driver errors in `cause`; raw `pg` errors carry the fields directly. */
function unwrapPostgresError(error: unknown): CapturedDatabaseError {
  let current: unknown = error;

  while (isPostgresErrorShape(current)) {
    if (typeof current.code === 'string') {
      return { code: current.code, constraint: current.constraint };
    }
    current = current.cause;
  }

  return {};
}

/** Awaits a promise that must reject and returns the PostgreSQL error code and constraint name. */
export async function captureDatabaseError(
  promise: Promise<unknown>
): Promise<CapturedDatabaseError> {
  try {
    await promise;
  } catch (error) {
    return unwrapPostgresError(error);
  }

  throw new Error('Expected the database operation to fail, but it succeeded');
}

export async function truncateAllTables(): Promise<void> {
  const result = await pool.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> $2',
    ['public', MIGRATIONS_TABLE_NAME]
  );

  if (result.rows.length === 0) {
    return;
  }

  const tableList = result.rows.map((row) => `"${row.tablename}"`).join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

export async function closeTestDatabasePool(): Promise<void> {
  await pool.end();
}

export function hashLabel(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

/** A syntactically valid owner token (64 lowercase hex characters). */
export function buildOwnerToken(label: string): string {
  return hashLabel(`owner:${label}`);
}

let emailSequence = 0;

export function buildUniqueEmail(): string {
  emailSequence += 1;
  return `integration-user-${emailSequence}@krepton.test`;
}

export async function createTestUser(email: string = buildUniqueEmail()): Promise<UserRow> {
  return createPasswordUser(
    email,
    TEST_PASSWORD_HASH,
    hashLabel(`verify:${email}`),
    new Date(Date.now() + MILLISECONDS_PER_HOUR)
  );
}

export async function createTestPortfolio(label: string): Promise<string> {
  return findOrCreatePortfolioAccount(buildOwnerToken(label));
}

export function buildPositionDto(overrides: Partial<AddPositionDto> = {}): AddPositionDto {
  return {
    ticker: 'AAPL',
    companyName: TEST_COMPANY_NAME,
    shares: 10,
    avgBuyPrice: 100,
    currency: TEST_USD,
    ...overrides,
  };
}

export async function createTestPosition(
  portfolioId: string,
  overrides: Partial<AddPositionDto> = {}
): Promise<PositionRow> {
  return upsertPosition(portfolioId, buildPositionDto(overrides));
}

/** `pg` returns DATE columns as local-midnight Date objects; this formats them as YYYY-MM-DD. */
export function formatDateColumn(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.slice(0, ISO_DATE_LENGTH);
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
