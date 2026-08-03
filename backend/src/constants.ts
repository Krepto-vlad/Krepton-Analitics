export const DEFAULT_PORT = 3001;

export const HISTORICAL_DATA_PERIODS = {
  ONE_WEEK: '7d',
  ONE_MONTH: '1mo',
  THREE_MONTHS: '3mo',
  SIX_MONTHS: '6mo',
  ONE_YEAR: '1y',
  TWO_YEARS: '2y',
  THREE_YEARS: '3y',
  FIVE_YEARS: '5y',
  TEN_YEARS: '10y',
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
  FX: '/api/fx',
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
export const YAHOO_QUOTE_MIN_FETCH_GAP_MS = 3_000;

// Browser HTTP cache for batch quotes GET — deduplicates polls across tabs.
export const QUOTE_BATCH_BROWSER_CACHE_TTL_S = 25;

// Fallback logo CDN when Yahoo omits companyLogoUrl (e.g. TTWO).
// `{ticker}` is replaced with an upper-case symbol.
export const FMP_STOCK_LOGO_URL_TEMPLATE =
  'https://financialmodelingprep.com/image-stock/{ticker}.png';

// Client poll intervals are configured on the frontend (watchlist + holdings).
// Both features share this server cache and Yahoo budget.

// Auth
export const BCRYPT_SALT_ROUNDS = 12;
export const JWT_COOKIE_NAME = 'accessToken';
// 15 minutes in ms — matches JWT_EXPIRES_IN=15m
export const JWT_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const PASSWORD_MIN_LENGTH = 10;
export const PORTFOLIO_DATA_DELETE_CONFIRMATION = 'DELETE';
export const PORTFOLIO_EXPORT_SCHEMA_VERSION = 1;
export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PORTFOLIO_EXPORT_FORMATS = ['json', 'xlsx'] as const;
export type PortfolioExportFormat = (typeof PORTFOLIO_EXPORT_FORMATS)[number];
export const DEFAULT_PORTFOLIO_EXPORT_FORMAT: PortfolioExportFormat = 'xlsx';
export const PORTFOLIO_EXPORT_XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Rate limiting on auth endpoints: max 10 attempts per 15 minutes
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 10;

// Sensitive export with password re-auth: max 5 attempts per 15 minutes per user
export const PORTFOLIO_EXPORT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const PORTFOLIO_EXPORT_RATE_LIMIT_MAX_REQUESTS = 5;

// Rate limiting on portfolio write endpoints: max 60 writes per 15 minutes
export const PORTFOLIO_WRITE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const PORTFOLIO_WRITE_RATE_LIMIT_MAX_REQUESTS = 60;

// Portfolio input validation limits
export const TICKER_MAX_LENGTH = 10;
export const TICKER_FORMAT_PATTERN = /^[A-Z0-9.\-=^]{1,10}$/;
export const COMPANY_NAME_MAX_LENGTH = 255;
export const MAX_SHARES = 999_999_999;
export const MAX_PRICE = 999_999_999;
export const ALLOWED_CURRENCIES: ReadonlyArray<string> = ['USD', 'EUR'] as const;
export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

// ─── FX rates (Frankfurter API) ───────────────────────────────────────────────
export const FRANKFURTER_API_BASE_URL = 'https://api.frankfurter.app';
export const FX_HISTORICAL_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const FX_TODAY_RATE_CACHE_TTL_MS = 30 * 60 * 1000;
export const FX_API_TIMEOUT_MS = 8_000;
export const FX_MAX_RANGE_DAYS = 365 * 5;

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

// ─── Broker import ────────────────────────────────────────────────────────────
export const SUPPORTED_BROKER_IDS = ['REVOLUT'] as const;
export type SupportedBrokerId = (typeof SUPPORTED_BROKER_IDS)[number];

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMPORT_MAX_ROWS = 5_000;
export const IMPORT_MAX_COLUMNS = 20;
export const IMPORT_MAX_SHEETS = 3;
export const IMPORT_PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const IMPORT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const IMPORT_RATE_LIMIT_MAX_REQUESTS = 10;
export const IMPORT_MAX_TRADES_PER_FILE = 2_000;

// ─── Portfolio news (Yahoo Finance search) ─────────────────────────────────────
export const PORTFOLIO_NEWS_MAX_TICKERS = 10;
export const PORTFOLIO_NEWS_PER_TICKER = 5;
export const PORTFOLIO_NEWS_MAX_ITEMS = 20;
export const PORTFOLIO_NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

// ─── AI (Gemini) — news summary + explain alignment ────────────────────────────
export const AI_FEATURES = ['news_summary', 'explain_alignment'] as const;
export type AiFeatureId = (typeof AI_FEATURES)[number];

export const AI_NEWS_SUMMARY_MAX_TICKERS = 5;
export const AI_NEWS_SUMMARY_MIN_TICKERS = 1;
export const AI_NEWS_SUMMARY_FREE_DAILY_LIMIT = 5;
export const AI_NEWS_SUMMARY_DISCLAIMER =
  'AI-generated summary for informational purposes only. Not financial advice. Verify prices and news with primary sources.';
export const AI_NEWS_SUMMARY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AI_NEWS_SUMMARY_RATE_LIMIT_MAX_REQUESTS = 10;
export const AI_BRIEFING_CACHE_VERSION = 'v2';

export const AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT = 5;
export const AI_EXPLAIN_ALIGNMENT_CACHE_VERSION = 'v1';
export const AI_EXPLAIN_ALIGNMENT_DISCLAIMER =
  'AI-generated explanation for informational purposes only. Not financial advice. No buy/sell recommendations.';
export const AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_MAX_REQUESTS = 10;
export const AI_EXPLAIN_ALIGNMENT_MAX_OUTPUT_TOKENS = 1024;

export const AI_BRIEFING_MACRO_TICKERS = [
  { ticker: 'SPY', label: 'S&P 500' },
  { ticker: 'QQQ', label: 'Nasdaq 100' },
  { ticker: 'CL=F', label: 'WTI Crude Oil' },
  { ticker: '^VIX', label: 'VIX Volatility' },
] as const;

export const AI_BRIEFING_SP500_TICKER = 'SPY';

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
export const GEMINI_GROUNDING_REQUEST_TIMEOUT_MS = 90_000;
export const GEMINI_MAX_OUTPUT_TOKENS = 2048;
export const GEMINI_TEMPERATURE = 0.3;

// ─── Stock comparison matrix ───────────────────────────────────────────────────
export const STOCK_COMPARE_MAX_TICKERS = 4;
export const STOCK_COMPARE_MIN_TICKERS = 2;
export const STOCK_COMPARE_CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Market movers (Yahoo screener) ────────────────────────────────────────────
export const MARKET_MOVERS_COUNT = 10;
export const MARKET_MOVERS_CACHE_TTL_MS = 10 * 60 * 1000;
export const MARKET_MOVERS_BROWSER_CACHE_TTL_S = 5 * 60;
export const MARKET_MOVERS_GAINERS_SCREENER_ID = 'day_gainers' as const;
export const MARKET_MOVERS_LOSERS_SCREENER_ID = 'day_losers' as const;

// ─── Light backtesting ─────────────────────────────────────────────────────────
export const BACKTEST_MAX_TICKERS = 4;
export const BACKTEST_MIN_TICKERS = 1;
export const BACKTEST_BENCHMARK_TICKER = 'SPY';
export const BACKTEST_BENCHMARK_LABEL = 'S&P 500';
export const BACKTEST_PERIODS = ['1y', '3y', '5y', '10y'] as const;
export type BacktestPeriod = (typeof BACKTEST_PERIODS)[number];
export const BACKTEST_DEFAULT_AMOUNT = 1000;
export const BACKTEST_MIN_AMOUNT = 1;
export const BACKTEST_MAX_AMOUNT = 10_000_000;
export const BACKTEST_HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
export const BACKTEST_ALLOCATION_TOTAL_PERCENT = 100;
export const BACKTEST_ALLOCATION_TOLERANCE = 0.01;

// ─── Dividend calendar ─────────────────────────────────────────────────────────
export const DIVIDEND_CALENDAR_CACHE_TTL_MS = 10 * 60 * 1000;
export const DIVIDEND_HISTORY_LOOKBACK_YEARS = 2;
export const DIVIDEND_PROJECTION_MONTHS = 12;
export const DIVIDEND_UPCOMING_PAYMENTS_LIMIT = 8;
export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
