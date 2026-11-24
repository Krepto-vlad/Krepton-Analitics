/** PostgreSQL SQLSTATE codes asserted by the integration suite. */
export const POSTGRES_ERROR_CODE = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
} as const;

export const MIGRATIONS_TABLE_NAME = 'pgmigrations';
export const MIGRATION_FILE_EXTENSION = '.js';

export const SHA256_HEX_LENGTH = 64;
export const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;
export const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

export const TEST_PASSWORD_HASH = '$2b$10$integrationTestPasswordHashValue000000000000000000000';
export const CONTRACT_TEST_PASSWORD = 'contract-test-password';
/** Lowest valid bcrypt cost keeps the login flow fast; production uses BCRYPT_SALT_ROUNDS. */
export const CONTRACT_TEST_BCRYPT_ROUNDS = 4;
export const TEST_COMPANY_NAME = 'Apple Inc.';
export const TEST_SECTOR_TECHNOLOGY = 'Technology';
export const TEST_USD = 'USD';

export const TRANSACTION_SOURCE = {
  MANUAL: 'manual',
  IMPORT: 'import',
  SNAPTRADE: 'snaptrade',
} as const;

export const REBALANCING_STRATEGY = {
  DEFAULT: 'ray-dalio-all-weather',
  BOGLEHEADS: 'bogleheads-three-fund',
  CUSTOM: 'custom',
} as const;

export const EXPECTED_TABLES = [
  'users',
  'portfolio_accounts',
  'positions',
  'transactions',
  'watchlist_items',
  'ai_news_summaries',
  'ai_usage_events',
  'billing_customers',
  'billing_entitlements',
  'billing_webhook_events',
  'snaptrade_users',
] as const;

/** Tables that hold portfolio data and must never reference `users`. */
export const ANONYMOUS_PORTFOLIO_TABLES = [
  'portfolio_accounts',
  'positions',
  'transactions',
  'watchlist_items',
] as const;

/** Tables that belong to a user and are removed with the account. */
export const USER_OWNED_TABLES = [
  'ai_news_summaries',
  'ai_usage_events',
  'billing_customers',
  'billing_entitlements',
  'snaptrade_users',
] as const;
