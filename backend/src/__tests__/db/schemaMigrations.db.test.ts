import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pool } from '../../config/db.js';
import { DB_ROLE_APP_ADMIN, DB_ROLE_APP_READ, DB_ROLE_APP_WRITE } from '../../constants.js';
import {
  ANONYMOUS_PORTFOLIO_TABLES,
  EXPECTED_TABLES,
  MIGRATION_FILE_EXTENSION,
  MIGRATIONS_TABLE_NAME,
  POSTGRES_ERROR_CODE,
  REBALANCING_STRATEGY,
  TEST_COMPANY_NAME,
  TEST_USD,
  USER_OWNED_TABLES,
} from './helpers/dbTestConstants.js';
import {
  buildOwnerToken,
  captureDatabaseError,
  closeTestDatabasePool,
  createTestPortfolio,
  truncateAllTables,
} from './helpers/testDatabase.js';

const MIGRATIONS_DIRECTORY = path.join(__dirname, '..', '..', 'migrations');
const VALID_SHARES = 5;
const VALID_PRICE = 10;
const INVALID_NON_POSITIVE = 0;
const INVALID_CURRENCY = 'GBP';
const INVALID_TICKER = 'bad ticker';
const BLANK_COMPANY_NAME = '   ';
const INVALID_TRANSACTION_TYPE = 'HOLD';
const INVALID_TRANSACTION_SOURCE = 'bot';
const INVALID_STRATEGY_ID = 'yolo-strategy';
const NON_HEX_OWNER_TOKEN = 'z'.repeat(64);

interface RawPositionValues {
  shares?: number;
  avgBuyPrice?: number;
  currency?: string;
  ticker?: string;
  companyName?: string;
}

interface RawTransactionValues {
  transactionType?: string;
  source?: string;
}

function insertRawPosition(portfolioId: string, values: RawPositionValues = {}): Promise<unknown> {
  return pool.query(
    `INSERT INTO positions (portfolio_id, ticker, company_name, shares, avg_buy_price, currency)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      portfolioId,
      values.ticker ?? 'AAPL',
      values.companyName ?? TEST_COMPANY_NAME,
      values.shares ?? VALID_SHARES,
      values.avgBuyPrice ?? VALID_PRICE,
      values.currency ?? TEST_USD,
    ]
  );
}

function insertRawTransaction(
  portfolioId: string,
  values: RawTransactionValues = {}
): Promise<unknown> {
  return pool.query(
    `INSERT INTO transactions
       (portfolio_id, ticker, company_name, shares, price_per_share, currency,
        transaction_type, source)
     VALUES ($1, 'AAPL', $2, $3, $4, $5, $6, $7)`,
    [
      portfolioId,
      TEST_COMPANY_NAME,
      VALID_SHARES,
      VALID_PRICE,
      TEST_USD,
      values.transactionType ?? 'BUY',
      values.source ?? 'manual',
    ]
  );
}

async function listPublicTables(): Promise<string[]> {
  const result = await pool.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1',
    ['public']
  );
  return result.rows.map((row) => row.tablename);
}

async function listTablesReferencing(referencedTable: string): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(
    `SELECT DISTINCT conrelid::regclass::text AS table_name
     FROM pg_constraint
     WHERE contype = 'f' AND confrelid = $1::regclass`,
    [referencedTable]
  );
  return result.rows.map((row) => row.table_name);
}

async function hasTablePrivilege(
  roleName: string,
  tableName: string,
  privilege: string
): Promise<boolean> {
  const result = await pool.query<{ allowed: boolean }>(
    'SELECT has_table_privilege($1, $2, $3) AS allowed',
    [roleName, tableName, privilege]
  );
  return result.rows[0].allowed;
}

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('migrations', () => {
  it('has applied every migration file exactly once', async () => {
    const migrationFiles = readdirSync(MIGRATIONS_DIRECTORY).filter((fileName) =>
      fileName.endsWith(MIGRATION_FILE_EXTENSION)
    );

    const result = await pool.query<{ name: string }>(
      `SELECT name FROM ${MIGRATIONS_TABLE_NAME} ORDER BY id`
    );
    const appliedNames = result.rows.map((row) => `${row.name}${MIGRATION_FILE_EXTENSION}`);

    expect(appliedNames).toEqual([...migrationFiles].sort());
  });

  it('creates every table the application reads or writes', async () => {
    const tables = await listPublicTables();

    expect(tables).toEqual(expect.arrayContaining([...EXPECTED_TABLES]));
  });
});

describe('anonymous portfolio design', () => {
  it('has no foreign key from any portfolio table to users', async () => {
    const referencingUsers = await listTablesReferencing('users');

    for (const portfolioTable of ANONYMOUS_PORTFOLIO_TABLES) {
      expect(referencingUsers).not.toContain(portfolioTable);
    }
  });

  it('links only user-owned tables to users', async () => {
    const referencingUsers = await listTablesReferencing('users');

    expect([...referencingUsers].sort()).toEqual([...USER_OWNED_TABLES].sort());
  });

  it('rejects an owner token that is not 64 lowercase hex characters', async () => {
    const error = await captureDatabaseError(
      pool.query('INSERT INTO portfolio_accounts (owner_token) VALUES ($1)', [NON_HEX_OWNER_TOKEN])
    );

    expect(error).toEqual({
      code: POSTGRES_ERROR_CODE.CHECK_VIOLATION,
      constraint: 'portfolio_accounts_owner_token_hex_check',
    });
  });

  it('rejects two portfolios with the same owner token', async () => {
    const ownerToken = buildOwnerToken('duplicate-owner');
    await pool.query('INSERT INTO portfolio_accounts (owner_token) VALUES ($1)', [ownerToken]);

    const error = await captureDatabaseError(
      pool.query('INSERT INTO portfolio_accounts (owner_token) VALUES ($1)', [ownerToken])
    );

    expect(error.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
  });
});

describe('data-quality constraints', () => {
  it.each([
    ['zero shares', { shares: INVALID_NON_POSITIVE }, 'positions_shares_positive_check'],
    [
      'zero average price',
      { avgBuyPrice: INVALID_NON_POSITIVE },
      'positions_avg_buy_price_positive_check',
    ],
    ['an unsupported currency', { currency: INVALID_CURRENCY }, 'positions_currency_allowed_check'],
    ['a malformed ticker', { ticker: INVALID_TICKER }, 'positions_ticker_format_check'],
    [
      'a blank company name',
      { companyName: BLANK_COMPANY_NAME },
      'positions_company_name_not_blank_check',
    ],
  ])('rejects a position with %s', async (_label, values, expectedConstraint) => {
    const portfolioId = await createTestPortfolio('constraint-position');

    const error = await captureDatabaseError(insertRawPosition(portfolioId, values));

    expect(error).toEqual({
      code: POSTGRES_ERROR_CODE.CHECK_VIOLATION,
      constraint: expectedConstraint,
    });
  });

  it.each([
    [
      'an unknown type',
      { transactionType: INVALID_TRANSACTION_TYPE },
      'transactions_type_allowed_check',
    ],
    ['an unknown source', { source: INVALID_TRANSACTION_SOURCE }, 'transactions_source_check'],
  ])('rejects a transaction with %s', async (_label, values, expectedConstraint) => {
    const portfolioId = await createTestPortfolio('constraint-transaction');

    const error = await captureDatabaseError(insertRawTransaction(portfolioId, values));

    expect(error).toEqual({
      code: POSTGRES_ERROR_CODE.CHECK_VIOLATION,
      constraint: expectedConstraint,
    });
  });

  it('rejects a rebalancing strategy outside the supported list', async () => {
    const portfolioId = await createTestPortfolio('constraint-strategy');

    const error = await captureDatabaseError(
      pool.query('UPDATE portfolio_accounts SET rebalancing_strategy_id = $1 WHERE id = $2', [
        INVALID_STRATEGY_ID,
        portfolioId,
      ])
    );

    expect(error.constraint).toBe('portfolio_accounts_strategy_id_check');
  });

  it('accepts a supported rebalancing strategy', async () => {
    const portfolioId = await createTestPortfolio('constraint-strategy-ok');

    await pool.query('UPDATE portfolio_accounts SET rebalancing_strategy_id = $1 WHERE id = $2', [
      REBALANCING_STRATEGY.BOGLEHEADS,
      portfolioId,
    ]);

    const result = await pool.query<{ rebalancing_strategy_id: string }>(
      'SELECT rebalancing_strategy_id FROM portfolio_accounts WHERE id = $1',
      [portfolioId]
    );
    expect(result.rows[0].rebalancing_strategy_id).toBe(REBALANCING_STRATEGY.BOGLEHEADS);
  });

  it('rejects a user with neither a password nor a Google identity', async () => {
    const error = await captureDatabaseError(
      pool.query('INSERT INTO users (email) VALUES ($1)', ['nobody@krepton.test'])
    );

    expect(error.constraint).toBe('users_has_password_or_google_check');
  });

  it('rejects the same ticker twice in one portfolio', async () => {
    const portfolioId = await createTestPortfolio('constraint-duplicate-ticker');
    await insertRawPosition(portfolioId);

    const error = await captureDatabaseError(insertRawPosition(portfolioId));

    expect(error).toEqual({
      code: POSTGRES_ERROR_CODE.UNIQUE_VIOLATION,
      constraint: 'positions_portfolio_ticker_unique',
    });
  });
});

describe('application database roles', () => {
  it('lets the write role change portfolio rows and the read role only read them', async () => {
    expect(await hasTablePrivilege(DB_ROLE_APP_WRITE, 'positions', 'INSERT')).toBe(true);
    expect(await hasTablePrivilege(DB_ROLE_APP_WRITE, 'positions', 'DELETE')).toBe(true);
    expect(await hasTablePrivilege(DB_ROLE_APP_READ, 'positions', 'SELECT')).toBe(true);
    expect(await hasTablePrivilege(DB_ROLE_APP_READ, 'positions', 'INSERT')).toBe(false);
  });

  it('gives the admin role full control and the write role no schema changes', async () => {
    expect(await hasTablePrivilege(DB_ROLE_APP_ADMIN, 'positions', 'TRUNCATE')).toBe(true);
    expect(await hasTablePrivilege(DB_ROLE_APP_WRITE, 'positions', 'TRUNCATE')).toBe(false);
  });
});
