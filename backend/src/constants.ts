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
  PORTFOLIO: '/api/portfolio',
} as const;

export const WS_QUOTE_POLL_INTERVAL_MS = 30_000;
export const WS_MAX_SUBSCRIPTIONS_PER_CLIENT = 5;

// ─── Yahoo Finance quote cache (shared by watchlist, portfolio, modals, WS) ───
// All on-demand quote reads go through one in-memory cache on the server.
// Tune TTL to balance freshness vs. Yahoo rate limits (unofficial API, IP-based).
export const YAHOO_QUOTE_CACHE_TTL_MS = 30_000;

// Max symbols per Yahoo batch request (watchlist cap matches MAX_WATCHLIST_ITEMS).
export const YAHOO_QUOTE_BATCH_MAX_SIZE = 50;

// Soft global budget for Yahoo outbound calls per minute (all features combined).
// Leaves headroom for history, search, sector, and future modules.
export const YAHOO_EXTERNAL_CALLS_BUDGET_PER_MINUTE = 20;

// Minimum gap between Yahoo batch fetches to avoid burst traffic.
export const YAHOO_QUOTE_MIN_FETCH_GAP_MS = 10_000;

// Browser HTTP cache for batch quotes GET — deduplicates polls across tabs.
export const QUOTE_BATCH_BROWSER_CACHE_TTL_S = 25;

// Client poll intervals are configured on the frontend (watchlist + holdings).
// Both features share this server cache and Yahoo budget.

// Auth
export const BCRYPT_SALT_ROUNDS = 12;
export const JWT_COOKIE_NAME = 'accessToken';
// 15 minutes in ms — matches JWT_EXPIRES_IN=15m
export const JWT_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

// Rate limiting on auth endpoints: max 10 attempts per 15 minutes
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

// Rate limiting on portfolio write endpoints: max 60 writes per 15 minutes
export const PORTFOLIO_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const PORTFOLIO_WRITE_RATE_LIMIT_MAX_REQUESTS = 60;

// Portfolio input validation limits
export const TICKER_MAX_LENGTH = 10;
export const COMPANY_NAME_MAX_LENGTH = 255;
export const MAX_SHARES = 999_999_999;
export const MAX_PRICE = 999_999_999;
export const ALLOWED_CURRENCIES: ReadonlyArray<string> = ['USD', 'EUR'] as const;

// Portfolio pagination defaults
export const HOLDINGS_PAGE_SIZE = 10;
export const TRANSACTIONS_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 50;
export const MAX_WATCHLIST_ITEMS = 50;

// Ticker tape is fetched once on startup and refreshed in the background every 24h.
// This means 0 Yahoo Finance calls per user request.
export const TICKER_TAPE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Browser HTTP cache TTL for public ticker-tape endpoint.
// All tabs in the same browser share one HTTP cache entry — no duplicate requests.
export const TICKER_TAPE_BROWSER_CACHE_TTL_S = 60 * 60; // 1 hour
