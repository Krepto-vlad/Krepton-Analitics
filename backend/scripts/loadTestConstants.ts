export const LOAD_TEST_DURATION_SECONDS = 10;
export const LOAD_TEST_CONNECTIONS = 50;
export const STRESS_TEST_CONNECTIONS = 100;
/** Steady request rate for authenticated scenarios; stays under the per-user read limiter. */
export const LOAD_TEST_REQUESTS_PER_SECOND = 400;
export const LOAD_TEST_VIRTUAL_USER_COUNT = 1000;
export const SEED_BATCH_SIZE = 50;
export const SEED_WATCHLIST_ITEMS_PER_USER = 5;
export const SEED_TRANSACTIONS_PER_USER = 10;

/** Pass criteria: lab thresholds for a single API instance next to a local PostgreSQL. */
export const MAX_P99_LATENCY_MS = 500;
export const MAX_NON_SUCCESS_RESPONSES = 0;

export const REPORT_DIRECTORY = 'coverage/load-test';
export const REPORT_FILENAME = 'load-test-report.json';
export const LOCAL_LISTEN_HOST = '127.0.0.1';
export const EPHEMERAL_PORT = 0;
export const SEED_TRANSACTION_TICKER = 'AAPL';
export const SEED_TRANSACTION_COMPANY_NAME = 'Apple Inc.';
export const SEED_TRANSACTION_SHARES = 1;
export const SEED_TRANSACTION_PRICE = 100;
export const SEED_TRANSACTION_CURRENCY = 'USD';
export const SEED_TRANSACTION_TYPE = 'BUY';
export const SEED_TRANSACTION_SOURCE = 'manual';
export const SEED_WATCHLIST_TICKER_PREFIX = 'T';
export const SEED_WATCHLIST_COMPANY_PREFIX = 'Company ';

export const TARGET_PATHS = {
  HEALTH: '/health',
  WATCHLIST: '/api/portfolio/watchlist',
  TRANSACTIONS: '/api/portfolio/transactions',
} as const;
