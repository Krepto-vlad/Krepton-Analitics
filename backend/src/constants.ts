export const DEFAULT_PORT = 3001;

export const HISTORICAL_DATA_PERIODS = {
  ONE_WEEK: '7d',
  ONE_MONTH: '1mo',
  THREE_MONTHS: '3mo',
  SIX_MONTHS: '6mo',
  ONE_YEAR: '1y',
  TWO_YEARS: '2y',
  FIVE_YEARS: '5y',
} as const;

export const HISTORICAL_DATA_INTERVALS = {
  ONE_DAY: '1d',
  ONE_WEEK: '1wk',
  ONE_MONTH: '1mo',
} as const;

export const SEARCH_RESULTS_LIMIT = 10;

export const API_ROUTES = {
  STOCKS: '/api/stocks',
  AUTH: '/api/auth',
} as const;

export const WS_QUOTE_POLL_INTERVAL_MS = 5000;
export const WS_MAX_SUBSCRIPTIONS_PER_CLIENT = 5;

// Auth
export const BCRYPT_SALT_ROUNDS = 12;
export const JWT_COOKIE_NAME = 'accessToken';
// 15 minutes in ms — matches JWT_EXPIRES_IN=15m
export const JWT_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

// Rate limiting on auth endpoints: max 10 attempts per 15 minutes
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

// Ticker tape is fetched once on startup and refreshed in the background every 24h.
// This means 0 Yahoo Finance calls per user request.
export const TICKER_TAPE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Browser HTTP cache TTL for public ticker-tape endpoint.
// All tabs in the same browser share one HTTP cache entry — no duplicate requests.
export const TICKER_TAPE_BROWSER_CACHE_TTL_S = 60 * 60; // 1 hour
