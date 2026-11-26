export const DEFAULT_PORT = 3001;
export const HTTPS_ORIGIN_PREFIX = 'https://';

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
  BILLING: '/api/billing',
  ADMIN: '/api/admin',
  DOCS: '/api/docs',
} as const;

export const HEALTH_CHECK_PATH = '/health';
export const OPENAPI_SPEC_FILENAME = 'openapi.yaml';
export const OPENAPI_SPEC_CONTENT_TYPE = 'application/yaml';
export const REQUEST_ID_HEADER_NAME = 'x-request-id';
export const REQUEST_ID_MAX_LENGTH = 128;
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const LOG_EVENT = {
  HTTP_REQUEST: 'http_request',
  SERVER_STARTED: 'server_started',
  SERVER_SHUTDOWN: 'server_shutdown',
  HTTP_SERVER_CLOSED: 'http_server_closed',
  DB_CONNECTED: 'db_connected',
  DB_CONNECTION_FAILED: 'db_connection_failed',
  DB_POOL_ERROR: 'db_pool_error',
  UNHANDLED_ERROR: 'unhandled_error',
  APP_ERROR: 'app_error',
  OPENAPI_SPEC_MISSING: 'openapi_spec_missing',
} as const;

export const WS_QUOTE_POLL_INTERVAL_MS = 30_000;
export const WS_MAX_SUBSCRIPTIONS_PER_CLIENT = 5;

// ─── Yahoo Finance quote cache (shared by watchlist, portfolio, modals, WS) ───
// All on-demand quote reads go through one in-memory cache on the server.
// Tune TTL to balance freshness vs. Yahoo rate limits (unofficial API, IP-based).
export const YAHOO_QUOTE_CACHE_TTL_MS = 30_000;

/** Fund category changes rarely. Rebalancing reads it from this cache instead of Yahoo on every view. */
export const FUND_PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const FUND_PROFILE_MISS_CACHE_TTL_MS = 5 * 60 * 1000;

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
/** Re-issue a full-lifetime access token when remaining TTL is at most half. */
export const JWT_SLIDING_RENEW_REMAINING_MS = JWT_COOKIE_MAX_AGE_MS / 2;
export const PASSWORD_MIN_LENGTH = 10;
export const PORTFOLIO_DATA_DELETE_CONFIRMATION = 'DELETE';
/** Typed confirmation phrase required for hard account deletion (GDPR erasure). */
export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE ACCOUNT';
export const PORTFOLIO_EXPORT_SCHEMA_VERSION = 2;
export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
export const PASSWORD_RESET_REQUEST_GENERIC_MESSAGE =
  'If an account exists for this email, we sent instructions. Check your inbox and Spam / Junk.';
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

// Blanket circuit breaker on all portfolio GET endpoints: normal usage (page loads,
// 30s live-polling scopes) stays well under this. Exists to cap runaway client-side
// loops (e.g. a buggy useEffect re-fetching on every render) and read scraping/abuse,
// which the write-only limiter above does not cover.
export const PORTFOLIO_READ_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const PORTFOLIO_READ_RATE_LIMIT_MAX_REQUESTS = 120;

// Portfolio input validation limits
export const TICKER_MAX_LENGTH = 10;
export const TICKER_FORMAT_PATTERN = /^[A-Z0-9.\-=^]{1,10}$/;

/** Yahoo quote types that stay on the account but stay out of portfolio math and AI. */
export const OUTSIDE_PORTFOLIO_ANALYSIS_QUOTE_TYPES = [
  'CRYPTOCURRENCY',
  'OPTION',
  'CURRENCY',
  'INDEX',
  'FUTURE',
  'ECNQUOTE',
  'ALTSYMBOL',
  'NONE',
] as const;

/** Yahoo crypto pairs look like XAUT-USD. Stock tickers such as BRK-B do not use these suffixes. */
export const OUTSIDE_PORTFOLIO_ANALYSIS_PAIR_SUFFIXES = ['USD', 'EUR', 'GBP', 'USDT'] as const;
export const COMPANY_NAME_MAX_LENGTH = 255;
export const MAX_SHARES = 999_999_999;
export const MAX_PRICE = 999_999_999;
export const ALLOWED_CURRENCIES: ReadonlyArray<string> = ['USD', 'EUR'] as const;
export type AllowedCurrency = (typeof ALLOWED_CURRENCIES)[number];

export const TRANSACTION_TYPES = ['BUY', 'SELL'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

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
/** Universal import labels all accounts as GENERIC (no per-broker selection). */
export const SUPPORTED_BROKER_IDS = ['GENERIC', 'SNAPTRADE'] as const;
export type SupportedBrokerId = (typeof SUPPORTED_BROKER_IDS)[number];
export const IMPORT_DEFAULT_BROKER_ID: SupportedBrokerId = 'GENERIC';
export const SNAPTRADE_BROKER_ID: SupportedBrokerId = 'SNAPTRADE';

/** SnapTrade Connection Portal slugs we expose. Revolut has no API — keep the parser. */
export const SNAPTRADE_CONNECTABLE_BROKERS = [
  { id: 'TRADING212', slug: 'TRADING212', label: 'Trading 212' },
  { id: 'DEGIRO', slug: 'DEGIRO', label: 'DEGIRO' },
  { id: 'ETORO', slug: 'ETORO', label: 'eToro' },
  { id: 'INTERACTIVEBROKERS', slug: 'INTERACTIVEBROKERS', label: 'Interactive Brokers' },
] as const;
export type SnaptradeConnectableBrokerId = (typeof SNAPTRADE_CONNECTABLE_BROKERS)[number]['id'];
export const SNAPTRADE_CONNECTION_TYPE = 'read';
export const SNAPTRADE_RETURN_QUERY = 'brokerSync';
export const SNAPTRADE_RETURN_CONNECTED = 'connected';
export const TRANSACTION_LEDGER_SOURCES = ['unknown', 'manual', 'import', 'snaptrade'] as const;
export type TransactionLedgerSource = (typeof TRANSACTION_LEDGER_SOURCES)[number];
export const TRANSACTION_SOURCE_SNAPTRADE: TransactionLedgerSource = 'snaptrade';
export const TRANSACTION_SOURCE_MANUAL: TransactionLedgerSource = 'manual';
export const TRANSACTION_SOURCE_IMPORT: TransactionLedgerSource = 'import';
export const SNAPTRADE_NOT_CONFIGURED_MESSAGE =
  'Broker sync is not configured on this server yet. Upload a statement or ask an admin for Plus.';
export const SNAPTRADE_PLUS_REQUIRED_MESSAGE = 'Plus is required to connect a brokerage account.';
export const SNAPTRADE_UNAVAILABLE_MESSAGE =
  'Broker sync is temporarily unavailable. Please try again.';
export const SNAPTRADE_NOT_CONNECTED_MESSAGE =
  'Connect a brokerage account first, then preview holdings.';
export const SNAPTRADE_NO_ACCOUNTS_MESSAGE =
  'No linked brokerage account yet. Finish connecting in the portal, then preview again.';
export const SNAPTRADE_INVALID_BROKER_MESSAGE =
  'That brokerage is not available for one-click connect. Upload a statement instead.';
export const SNAPTRADE_PREVIEW_WARNING =
  "This is today's holdings snapshot (quantity and average price), not a full trade history. Tickers you already added from a file or by hand will be skipped so we do not overwrite them.";
export const SNAPTRADE_PORTAL_REDIRECT_PATH = '/portfolio?section=importer';
export const SNAPTRADE_CONFIRM_FILE_PREVIEW_MESSAGE =
  'That preview is a file import. Confirm it from the statement importer.';
export const SNAPTRADE_CONFIRM_HOLDINGS_PREVIEW_MESSAGE =
  'Confirm broker holdings from the broker-sync endpoint.';
export const SNAPTRADE_SKIP_EXISTING_TICKER_REASON =
  'Already has imported or manual trades — left unchanged';
export const SNAPTRADE_AUTHORIZATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SNAPTRADE_INVALID_CONNECTION_ID_MESSAGE = 'That brokerage connection id is not valid.';
export const SNAPTRADE_CONNECTION_NOT_FOUND_MESSAGE =
  'That brokerage connection was not found. Refresh the list and try again.';
export const TRANSACTION_LEDGER_SOURCE_UNKNOWN: TransactionLedgerSource = 'unknown';
/** Used when a statement has no currency column (common in stripped exports). */
export const IMPORT_DEFAULT_CURRENCY = 'USD';

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMPORT_MAX_ROWS = 5_000;
export const IMPORT_MAX_COLUMNS = 40;
export const IMPORT_MAX_SHEETS = 3;
export const IMPORT_PREVIEW_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const IMPORT_MAX_TRADES_PER_FILE = 2_000;
export const IMPORT_ALLOWED_EXTENSIONS = ['.xlsx', '.csv'] as const;

/** Heuristic confidence in [0, 1]; below this → try Gemini schema assist. */
export const IMPORT_HEURISTIC_CONFIDENCE_THRESHOLD = 0.72;
/** Max sheet rows scanned when looking for a header row. */
export const IMPORT_HEADER_SCAN_MAX_ROWS = 40;
/**
 * GDPR: only a small anonymized sample is sent to Gemini for column mapping.
 * Never send the full statement / all trades.
 */
export const IMPORT_AI_SCHEMA_SAMPLE_ROWS = 20;
export const IMPORT_AI_SCHEMA_MAX_CELL_CHARS = 48;
/** Includes Gemini thinking tokens. The mapping JSON itself stays small. */
export const IMPORT_AI_SCHEMA_MAX_OUTPUT_TOKENS = 2048;
export const IMPORT_AI_SCHEMA_FREE_DAILY_LIMIT = 10;
export const IMPORT_AI_SCHEMA_PAID_DAILY_LIMIT = 50;
export const IMPORT_AI_SCHEMA_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const IMPORT_AI_SCHEMA_RATE_LIMIT_MAX_REQUESTS = 10;

// ─── Portfolio news (Yahoo Finance search) ─────────────────────────────────────
export const PORTFOLIO_NEWS_MAX_TICKERS = 10;
export const PORTFOLIO_NEWS_PER_TICKER = 5;
export const PORTFOLIO_NEWS_MAX_ITEMS = 20;
export const PORTFOLIO_NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
export const STOCK_NEWS_BROWSER_CACHE_TTL_S = Math.floor(PORTFOLIO_NEWS_CACHE_TTL_MS / 1000);

// ─── AI (Gemini) — news summary + explain alignment ────────────────────────────
export const AI_FEATURES = [
  'news_summary',
  'explain_alignment',
  'import_schema',
  'ticker_chat',
] as const;
export type AiFeatureId = (typeof AI_FEATURES)[number];

export const AI_NEWS_SUMMARY_MAX_TICKERS = 5;
export const AI_NEWS_SUMMARY_MIN_TICKERS = 1;
export const AI_NEWS_SUMMARY_FREE_DAILY_LIMIT = 5;
export const AI_NEWS_SUMMARY_PAID_DAILY_LIMIT = 50;
export const AI_NEWS_SUMMARY_DISCLAIMER =
  'AI-generated summary for informational purposes only. Not financial advice. Verify prices and news with primary sources.';
export const AI_NEWS_SUMMARY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AI_NEWS_SUMMARY_RATE_LIMIT_MAX_REQUESTS = 10;
export const AI_BRIEFING_CACHE_VERSION = 'v2';

export const AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT = 5;
export const AI_EXPLAIN_ALIGNMENT_PAID_DAILY_LIMIT = 50;
export const AI_EXPLAIN_ALIGNMENT_CACHE_VERSION = 'v2';
export const AI_EXPLAIN_ALIGNMENT_DISCLAIMER =
  'AI-generated explanation for informational purposes only. Not financial advice. No buy/sell recommendations. False-diversification notes are qualitative (no ETF look-through holdings data).';
export const AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_MAX_REQUESTS = 10;
/** Includes Gemini thinking tokens, not only the JSON explanation. */
export const AI_EXPLAIN_ALIGNMENT_MAX_OUTPUT_TOKENS = 4096;

export const AI_TICKER_CHAT_FREE_DAILY_LIMIT = 20;
export const AI_TICKER_CHAT_PAID_DAILY_LIMIT = 200;
export const AI_TICKER_CHAT_DISCLAIMER =
  'AI chat for informational purposes only. Not financial advice.';
export const AI_TICKER_CHAT_PAGE_SUBJECT = 'this page';
export const AI_EMPTY_REPLY_ERROR_MESSAGE = 'AI returned an empty response. Please try again.';
export const AI_TICKER_CHAT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AI_TICKER_CHAT_RATE_LIMIT_MAX_REQUESTS = 30;
/** Includes Gemini thinking tokens. The prompt still asks for a short reply. */
export const AI_TICKER_CHAT_MAX_OUTPUT_TOKENS = 4096;
/** Soft cap for the current user message (composer input). */
export const AI_TICKER_CHAT_MAX_MESSAGE_CHARS = 1000;
/** Per-message cap for history items (assistant replies are often longer than user input). */
export const AI_TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS = 4000;
/** Total history char budget sent to the model; oldest messages are dropped first. */
export const AI_TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS = 6000;
export const AI_TICKER_CHAT_MAX_HISTORY_MESSAGES = 6;
/** Companies named in one question. Keeps Yahoo calls and the prompt small. */
export const AI_TICKER_CHAT_QUESTION_MAX_TICKERS = 3;
/** Name lookups after the alias list. Explicit symbols do not count toward this. */
export const AI_TICKER_CHAT_QUESTION_MAX_SEARCHES = 2;
/** Screen kinds that contain the user's own portfolio, not public market data. */
export const AI_TICKER_CHAT_PERSONAL_SCREEN_KINDS = [
  'portfolio',
  'rebalancing',
  'watchlist',
  'dividends',
  'backtest',
] as const;
/** Chart period tokens that look like tickers but are not symbols. */
export const AI_TICKER_CHAT_IGNORED_SYMBOLS = [
  '1D',
  '1W',
  '1M',
  '3M',
  '6M',
  '1Y',
  '2Y',
  '5Y',
  'MAX',
] as const;
/**
 * Common company names, including Russian spellings, resolved without a search call.
 * Unknown English names still go through ticker search.
 */
export const AI_TICKER_CHAT_COMPANY_ALIASES = [
  { ticker: 'MSFT', names: ['microsoft', 'майкрософт', 'микрософт', 'макрософт'] },
  { ticker: 'GOOGL', names: ['google', 'alphabet', 'гугл', 'гугла', 'гугле', 'алфавит'] },
  { ticker: 'AAPL', names: ['apple', 'эпл', 'эппл'] },
  { ticker: 'AMZN', names: ['amazon', 'амазон', 'амазона'] },
  { ticker: 'NVDA', names: ['nvidia', 'нвидиа', 'нвидия', 'энвидиа'] },
  { ticker: 'TSLA', names: ['tesla', 'тесла', 'теслы', 'теслу'] },
  { ticker: 'META', names: ['meta', 'facebook', 'мета', 'фейсбук'] },
  { ticker: 'NFLX', names: ['netflix', 'нетфликс'] },
  {
    ticker: '^GSPC',
    names: ['s&p 500', 's&p500', 'sp500', 'spx', 'эс энд пи', 'эсэндпи'],
  },
  {
    ticker: '^IXIC',
    names: ['nasdaq composite', 'nasdaq', 'наздак', 'насдак'],
  },
  {
    ticker: '^DJI',
    names: ['dow jones', 'dow', 'доу джонс', 'доу'],
  },
  {
    ticker: '^RUT',
    names: ['russell 2000', 'russell2000', 'рассел 2000', 'расел 2000'],
  },
] as const;
export const AI_CHAT_TICKER_TYPO_MAX_DISTANCE = 2;
export const AI_CHAT_TICKER_TYPO_MIN_TICKER_LENGTH = 3;
/** Relative error vs Krepton quote before a stated price is treated as a hallucination. */
export const AI_CHAT_FACT_CHECK_PRICE_RELATIVE_TOLERANCE = 0.05;
export const AI_CHAT_FACT_CHECK_SHARES_ABS_TOLERANCE = 0.0001;
export const GEMINI_GROUNDING_MAX_SOURCES = 8;
export const AI_CHAT_FACT_CHECK_MARKER_EN = 'Krepton fact-check:';
export const AI_CHAT_FACT_CHECK_MARKER_RU = 'Проверка Krepton:';

export const AI_BRIEFING_MACRO_TICKERS = [
  { ticker: 'SPY', label: 'S&P 500' },
  { ticker: 'QQQ', label: 'Nasdaq 100' },
  { ticker: 'CL=F', label: 'WTI Crude Oil' },
  { ticker: '^VIX', label: 'VIX Volatility' },
] as const;

export const AI_BRIEFING_SP500_TICKER = 'SPY';

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_MODEL = 'gemini-3.8-flash';
/**
 * Gemini 3.8 thinks by default (`medium`), and those tokens count against maxOutputTokens.
 * `low` is the supported minimum and keeps chat plus JSON inside the request timeout.
 */
export const GEMINI_THINKING_LEVEL = 'low';
export const GEMINI_REQUEST_TIMEOUT_MS = 30_000;
export const GEMINI_GROUNDING_REQUEST_TIMEOUT_MS = 90_000;
/** Includes Gemini thinking tokens for the news briefing JSON. */
export const GEMINI_MAX_OUTPUT_TOKENS = 8192;

// ─── Stock history / fundamentals (ticker detail) ──────────────────────────────
export const STOCK_HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
export const STOCK_HISTORY_BROWSER_CACHE_TTL_S = 60;
export const STOCK_FUNDAMENTALS_BROWSER_CACHE_TTL_S = 60;
export const STOCK_ASSET_CLASS_BROWSER_CACHE_TTL_S = 60;

// ─── Stock comparison matrix ───────────────────────────────────────────────────
export const STOCK_COMPARE_MAX_TICKERS = 4;
export const STOCK_COMPARE_MIN_TICKERS = 2;
export const STOCK_COMPARE_CACHE_TTL_MS = 5 * 60 * 1000;
/** Metrics the chat draws itself when the user is on the comparison matrix. */
export const TICKER_CHAT_COMPARE_BAR_METRICS = [
  { key: 'peRatio', title: 'P/E', unit: 'multiple' },
  { key: 'revenueGrowth', title: 'Revenue growth', unit: 'percent' },
  { key: 'profitMargin', title: 'Profit margin', unit: 'percent' },
] as const;
/** Ticker-to-bucket lines included in a rebalancing chat prompt. */
export const TICKER_CHAT_REBALANCING_MAX_MAPPINGS = 12;
/** Upcoming dividend rows included in a dividend-calendar chat prompt. */
export const TICKER_CHAT_SCREEN_MAX_PAYMENTS = 12;
/** Rows kept on a chat screen card: weights, headlines, or watchlist quotes. */
export const TICKER_CHAT_SCREEN_MAX_ROWS = 12;
export const TICKER_CHAT_SCREEN_HEADLINE_MAX_CHARS = 180;
export const TICKER_CHAT_WEIGHT_PERCENT_SCALE = 10;
/** Chart periods the ticker page can show. History is refetched for the chat. */
export const TICKER_CHAT_CHART_PERIODS = ['7d', '1mo', '3mo', '6mo', '1y', '2y', '5y'] as const;
export const TICKER_CHAT_CHART_PERIOD_LABELS: Record<
  (typeof TICKER_CHAT_CHART_PERIODS)[number],
  string
> = {
  '7d': '1W',
  '1mo': '1M',
  '3mo': '3M',
  '6mo': '6M',
  '1y': '1Y',
  '2y': '2Y',
  '5y': '5Y',
};
export const TICKER_CHAT_CHART_INTERVAL = HISTORICAL_DATA_INTERVALS.ONE_DAY;
export const TICKER_CHAT_PAIR_TOPICS = ['metrics', 'returns', 'paths'] as const;

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
/** @deprecated Use STOCK_HISTORY_CACHE_TTL_MS — shared with ticker detail /history. */
export const BACKTEST_HISTORY_CACHE_TTL_MS = STOCK_HISTORY_CACHE_TTL_MS;
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

// ─── Billing (Paddle Merchant of Record) ───────────────────────────────────────
export const BILLING_CHECKOUT_INTERVALS = ['month', 'year'] as const;
export type BillingCheckoutInterval = (typeof BILLING_CHECKOUT_INTERVALS)[number];
export const BILLING_PLAN_PLUS = 'plus';
export const BILLING_ACCESS_GRACE_MS = 60 * 60 * 1000;
export const BILLING_NOT_CONFIGURED_MESSAGE =
  'Paid checkout is not configured on this server yet. Complimentary access can still be granted by an admin.';
export const BILLING_WEBHOOK_INVALID_SIGNATURE_MESSAGE = 'Invalid Paddle webhook signature';
export const PADDLE_ENVIRONMENTS = ['sandbox', 'production'] as const;
export type PaddleEnvironmentName = (typeof PADDLE_ENVIRONMENTS)[number];
export const PADDLE_STATUSES_WITH_PERIOD_ACCESS = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'paused',
] as const;
export type PaddlePeriodAccessStatus = (typeof PADDLE_STATUSES_WITH_PERIOD_ACCESS)[number];
export const BILLING_CUSTOM_DATA_USER_ID_KEY = 'userId';

/** Rubric names: read / write / admin. Prefix avoids colliding with a cluster role named `admin`. */
export const DB_ROLE_APP_READ = 'app_read';
export const DB_ROLE_APP_WRITE = 'app_write';
export const DB_ROLE_APP_ADMIN = 'app_admin';

/** Defense / empty-stand account. Never seed this in production. */
export const SEED_DEMO_EMAIL = 'demo@krepton.local';
export const SEED_DEMO_PASSWORD_FALLBACK = 'DemoPassw0rd!';
