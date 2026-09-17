export const API_BASE_URL = import.meta.env.VITE_API_URL as string;
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
/** Matches backend HEALTH_CHECK_PATH — used to pre-warm a scaled-to-zero API container. */
export const BACKEND_HEALTH_CHECK_PATH = '/health';

/** Clear the SPA session slightly before JWT exp so in-flight calls do not race 401. */
export const SESSION_EXPIRY_SKEW_MS = 2_000;
/** Keep in sync with backend JWT_COOKIE_MAX_AGE_MS. */
export const SESSION_TTL_MS = 15 * 60 * 1000;
/** Keep in sync with backend JWT_SLIDING_RENEW_REMAINING_MS. */
export const SESSION_RENEW_REMAINING_MS = SESSION_TTL_MS / 2;
export const SESSION_ACTIVITY_THROTTLE_MS = 30_000;
export const SESSION_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
export const HTTP_UNAUTHORIZED_STATUS = 401;

export const PADDLE_CHECKOUT_COMPLETED_EVENT = 'checkout.completed';
export const PADDLE_CHECKOUT_CLOSED_EVENT = 'checkout.closed';
export const BILLING_CHECKOUT_STATUS_RETRY_ATTEMPTS = 4;
export const BILLING_CHECKOUT_STATUS_RETRY_MS = 1_500;

/** Axios 401 on these /api/auth paths is a failed login, not an expired session. */
export const PUBLIC_AUTH_API_PATH_MARKERS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
] as const;

/** 401 bodies that mean the HttpOnly JWT is missing/expired — not a failed step-up password. */
export const SESSION_EXPIRED_API_MESSAGES = [
  'Unauthorized',
  'Invalid or expired token',
  'User not found',
] as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PRICING: '/pricing',
  SECURITY: '/security',
  LEGAL: '/legal',
  LEGAL_DOCUMENT: '/legal/:documentId',
  PRIVACY: '/legal/privacy-policy',
  TERMS: '/legal/terms-of-service',
  DASHBOARD: '/dashboard',
  PORTFOLIO: '/portfolio',
  PROFILE: '/profile',
  SUBSCRIPTION: '/subscription',
  ADMIN: '/admin',
  REBALANCING: '/rebalancing',
  SCREENER: '/screener',
  BACKTESTING: '/backtesting',
  DIVIDENDS: '/dividends',
  NEWS: '/news',
  WATCHLIST: '/watchlist',
  TICKER: '/ticker/:ticker',
} as const;

/** Watchlist UI lives on Portfolio; `/watchlist` redirects here. */
export const PORTFOLIO_WATCHLIST_PATH = `${ROUTES.PORTFOLIO}?section=watchlist`;

/** Statement importer + SnapTrade connect live on Portfolio. */
export const PORTFOLIO_IMPORTER_PATH = `${ROUTES.PORTFOLIO}?section=importer`;
export const BROKER_SYNC_RETURN_QUERY = 'brokerSync';
export const BROKER_SYNC_CONNECTED = 'connected';

/** SnapTrade hosts square logos; no local downloads needed. */
const SNAPTRADE_BROKER_LOGO_BASE = 'https://passiv-brokerage-logos.s3.ca-central-1.amazonaws.com';

/** Keep slugs in sync with backend SNAPTRADE_CONNECTABLE_BROKERS. Revolut stays parser-only. */
export const SNAPTRADE_CONNECTABLE_BROKERS = [
  {
    id: 'TRADING212',
    label: 'Trading 212',
    logoUrl: `${SNAPTRADE_BROKER_LOGO_BASE}/trading212-logo-square.png`,
  },
  {
    id: 'DEGIRO',
    label: 'DEGIRO',
    logoUrl: `${SNAPTRADE_BROKER_LOGO_BASE}/degiro-logo-square.png`,
  },
  {
    id: 'ETORO',
    label: 'eToro',
    logoUrl: `${SNAPTRADE_BROKER_LOGO_BASE}/etoro-logo-square.png`,
  },
  {
    id: 'INTERACTIVEBROKERS',
    label: 'Interactive Brokers',
    logoUrl: `${SNAPTRADE_BROKER_LOGO_BASE}/interactive-brokers-logo-square.png`,
  },
] as const;
export type SnaptradeConnectableBrokerId = (typeof SNAPTRADE_CONNECTABLE_BROKERS)[number]['id'];

/** React Router splat — unknown paths render NotFoundPage. Not a navigable URL. */
export const ROUTE_CATCH_ALL_PATH = '*';

export function buildTickerDetailPath(ticker: string): string {
  return `/ticker/${encodeURIComponent(ticker.trim().toUpperCase())}`;
}

/** Keep in sync with backend TICKER_FORMAT_PATTERN. */
export const TICKER_FORMAT_PATTERN = /^[A-Z0-9.\-=^]{1,10}$/;

export const HTTP_STATUS_NOT_FOUND = 404;

export function formatTickerNotFoundMessage(ticker: string): string {
  return `No ticker named ${ticker.trim().toUpperCase()} was found.`;
}

/** React Router location.state flag: scroll landing page to #features after navigation. */
export const LANDING_SCROLL_TO_FEATURES_STATE = { scrollToFeatures: true } as const;

/** Accessible names for every async state: skeleton placeholders and spinners. */
export const LOADING_MESSAGES = {
  DEFAULT: 'Loading…',
  SESSION: 'Loading session…',
  PORTFOLIO_POSITIONS: 'Loading positions…',
  PORTFOLIO_HOLDINGS: 'Loading portfolio…',
  PORTFOLIO_EQUITY: 'Loading portfolio equity…',
  PORTFOLIO_ALIGNMENT: 'Loading strategy alignment…',
  PORTFOLIO_TRANSACTIONS: 'Loading transaction history…',
  PORTFOLIO_PURCHASES: 'Loading purchases…',
  PORTFOLIO_NEWS: 'Loading news for your holdings…',
  WATCHLIST: 'Loading watchlist…',
  DIVIDEND_CALENDAR: 'Loading dividend calendar…',
  REBALANCING_ANALYSIS: 'Loading rebalancing analysis…',
  STOCK_COMPARE: 'Loading comparison data…',
  MARKET_MOVERS: 'Loading market movers…',
  BACKTEST_CALCULATION: 'Calculating backtest…',
  TICKER_DETAILS: 'Loading ticker details…',
  TICKER_QUOTE: 'Loading quote…',
  TICKER_FUNDAMENTALS: 'Loading fundamentals…',
  TICKER_PRICE_HISTORY: 'Loading price history…',
  TICKER_NEWS: 'Loading news…',
  AI_QUOTA: 'Loading AI quota…',
  AI_NEWS_BRIEFING: 'Generating briefing…',
  AI_ALIGNMENT_EXPLANATION: 'Generating explanation…',
  AI_CHAT_REPLY: 'Generating reply…',
} as const;

/** Row/column counts drive skeleton structure; every size lives in SCSS. */
export const SKELETON_TABLE_ROW_COUNT = 6;
export const SKELETON_TABLE_COLUMN_COUNT = 5;
export const SKELETON_LIST_ITEM_COUNT = 5;
export const SKELETON_NEWS_ITEM_COUNT = 4;
export const SKELETON_CARD_COUNT = 3;
export const SKELETON_STAT_ROW_COUNT = 8;
export const SKELETON_MOVER_COLUMN_COUNT = 2;
export const SKELETON_MOVER_ROW_COUNT = 5;
export const SKELETON_COMPARE_COLUMN_COUNT = 3;

export const ERROR_BOUNDARY_TITLE = 'Something went wrong';
export const ERROR_BOUNDARY_RETRY_LABEL = 'Try again';
export const ERROR_BANNER_DISMISS_LABEL = 'Dismiss error';

export const NOT_FOUND_STATUS_DIGIT = '4';
export const NOT_FOUND_TITLE = 'OOPS! PAGE NOT FOUND';
export const NOT_FOUND_MESSAGE = "Sorry, the page you're looking for doesn't exist.";
export const NOT_FOUND_HOME_LABEL = 'Go to home';
export const NOT_FOUND_SMILEY_SRC = '/smile.svg';
export const NOT_FOUND_CODE_LABEL = '404';
export const CLIENT_ERROR_LOG_PREFIX = '[AppErrorBoundary]';

export const PORTFOLIO_DATA_DELETE_CONFIRMATION = 'DELETE';
export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE ACCOUNT';

export const PORTFOLIO_EXPORT_FORMATS = ['xlsx', 'json'] as const;
export type PortfolioExportFormat = (typeof PORTFOLIO_EXPORT_FORMATS)[number];
export const DEFAULT_PORTFOLIO_EXPORT_FORMAT: PortfolioExportFormat = 'xlsx';

export const STOCK_PERIODS = [
  { label: '1W', value: '7d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
] as const;

export const CHART_COLORS = {
  UP: '#26a69a',
  DOWN: '#f87171',
  BACKGROUND: '#111113',
  GRID: 'rgba(255,255,255,0.04)',
  TEXT: '#a8a8b3',
  BORDER: 'rgba(255,255,255,0.08)',
  TRADE_BUY: '#26a69a',
  TRADE_SELL: '#f87171',
} as const;

export const CHART_TRADE_MARKER_SIZE = 1.25;
export const CHART_TRADE_TOOLTIP_OFFSET_PX = 12;
export const CHART_TRADE_TOOLTIP_MIN_TOP_PX = 8;

export const DEFAULT_TICKER = 'AAPL';
export const DEFAULT_PERIOD = '1y';
export const DEFAULT_INTERVAL = '1d';

/** Keep in sync with backend STOCK_HISTORY_CACHE_TTL_MS / STOCK_COMPARE_CACHE_TTL_MS. */
export const TICKER_HISTORY_CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;
export const TICKER_FUNDAMENTALS_CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
export const TICKER_QUOTE_CLIENT_CACHE_TTL_MS = 30_000;
/** Keep in sync with backend PORTFOLIO_NEWS_CACHE_TTL_MS. */
export const TICKER_NEWS_CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;
export const TICKER_NEWS_INITIAL_VISIBLE = 6;
export const TICKER_NEWS_LOAD_MORE_STEP = 6;

/** Right-side AI chat drawer on the ticker detail page (shell only for now). */
export const TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX = 380;
export const TICKER_CHAT_DRAWER_MIN_WIDTH_PX = 280;
export const TICKER_CHAT_DRAWER_MAX_WIDTH_PX = 640;
/** Keep in sync with backend AI_TICKER_CHAT_* history/message limits. */
export const TICKER_CHAT_MAX_MESSAGE_CHARS = 1000;
export const TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS = 4000;
export const TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS = 12000;
export const TICKER_CHAT_MAX_HISTORY_MESSAGES = 12;
/** Keep in sync with backend AI_TICKER_CHAT_DISCLAIMER. */
export const TICKER_CHAT_DISCLAIMER =
  'AI chat for informational purposes only. Not financial advice. Answers are scoped to the selected ticker.';
export const TICKER_CHAT_QUOTE_CHECKED_LABEL = 'Krepton quote';
export const TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL = 'Numbers aligned to the Krepton quote';
export const TICKER_CHAT_WEB_SEARCH_LABEL = 'Web search';
export const TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY = 'krepton_ticker_chat_include_holding_v1';
export const TICKER_CHAT_INCLUDE_HOLDING_LABEL =
  'Include my position (shares, avg price, unrealized P/L)';
export const TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP =
  'Adds your position size, average buy price, and unrealized P/L for this ticker to the AI prompt. Off by default. No email, account IDs, or other personal information is sent.';
/**
 * Suggestion chips above the chat thread. `{ticker}` is replaced at render time.
 * Keep exactly 8 for a balanced marquee loop.
 */
export const TICKER_CHAT_SUGGESTION_PROMPTS = [
  'What moved {ticker} today?',
  'Summarize key risks for {ticker}',
  'How is my position in {ticker} doing?',
  'Explain the latest price move for {ticker}',
  'What catalysts should I watch for {ticker}?',
  'How does valuation look for {ticker} right now?',
  'What could go wrong with {ticker}?',
  'Give a neutral overview of {ticker}',
] as const;
/** Suggestion marquee loop duration; keep in sync with TickerChatDrawer.module.scss. */
export const TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC = 45;
/** Keep in sync with AppShell `$header-height`. */
export const APP_SHELL_HEADER_HEIGHT_PX = 60;

/** Yahoo marketState → UI labels (exchange hours already baked into Yahoo's state). */
export const STOCK_MARKET_SESSION_LABELS = {
  PRE: 'Premarket',
  PREPRE: 'Premarket',
  REGULAR: 'Open',
  POST: 'After hours',
  POSTPOST: 'After hours',
  CLOSED: 'Closed',
  AT_CLOSE: 'At close',
  UNKNOWN: 'Market',
} as const;

export const STOCK_MARKET_SESSION_TOOLTIP_STATUS = {
  PRE: 'Premarket trading is active.',
  REGULAR: 'Regular session is open.',
  POST: 'After-hours trading is active.',
  CLOSED: 'Regular session is closed.',
  UNKNOWN: 'Market session could not be determined.',
} as const;

export const STOCK_MARKET_SESSION_TIME_PREFIX = {
  EXCHANGE: 'Exchange time',
  LOCAL: 'Your time',
} as const;

/** Shown only when the listing maps to US Eastern time — not a live tape clock. */
export const STOCK_MARKET_SESSION_US_HOURS_HINT = {
  PRE: 'Typical premarket: 4:00 AM–9:30 AM ET.',
  REGULAR: 'Typical regular hours: 9:30 AM–4:00 PM ET.',
  POST: 'Typical after hours: 4:00 PM–8:00 PM ET.',
  CLOSED: 'Typical regular hours: 9:30 AM–4:00 PM ET.',
  UNKNOWN: null,
} as const;

export const STOCK_US_EASTERN_TIME_ZONE = 'America/New_York';

/** Yahoo exchange codes / full names → IANA zone. Unknown listings fall back to local time. */
export const STOCK_EXCHANGE_TIME_ZONES: Record<string, string> = {
  NASDAQGS: STOCK_US_EASTERN_TIME_ZONE,
  NASDAQGM: STOCK_US_EASTERN_TIME_ZONE,
  NASDAQCM: STOCK_US_EASTERN_TIME_ZONE,
  NASDAQ: STOCK_US_EASTERN_TIME_ZONE,
  NMS: STOCK_US_EASTERN_TIME_ZONE,
  NGSM: STOCK_US_EASTERN_TIME_ZONE,
  NGM: STOCK_US_EASTERN_TIME_ZONE,
  NCM: STOCK_US_EASTERN_TIME_ZONE,
  NYSE: STOCK_US_EASTERN_TIME_ZONE,
  NYQ: STOCK_US_EASTERN_TIME_ZONE,
  NYSEARCA: STOCK_US_EASTERN_TIME_ZONE,
  PCX: STOCK_US_EASTERN_TIME_ZONE,
  NYSEAMERICAN: STOCK_US_EASTERN_TIME_ZONE,
  ASE: STOCK_US_EASTERN_TIME_ZONE,
  AMEX: STOCK_US_EASTERN_TIME_ZONE,
  BATS: STOCK_US_EASTERN_TIME_ZONE,
  BTS: STOCK_US_EASTERN_TIME_ZONE,
  CBOEBZX: STOCK_US_EASTERN_TIME_ZONE,
  LONDON: 'Europe/London',
  LSE: 'Europe/London',
  XLON: 'Europe/London',
  XETRA: 'Europe/Berlin',
  GER: 'Europe/Berlin',
  FRANKFURT: 'Europe/Berlin',
  FRA: 'Europe/Berlin',
  PARIS: 'Europe/Paris',
  PAR: 'Europe/Paris',
  AMSTERDAM: 'Europe/Amsterdam',
  AMS: 'Europe/Amsterdam',
  TORONTO: 'America/Toronto',
  TOR: 'America/Toronto',
  TSE: 'America/Toronto',
  TOKYO: 'Asia/Tokyo',
  TYO: 'Asia/Tokyo',
  JPX: 'Asia/Tokyo',
  HONGKONG: 'Asia/Hong_Kong',
  HKSE: 'Asia/Hong_Kong',
  HKG: 'Asia/Hong_Kong',
  ASX: 'Australia/Sydney',
};

export const WS_RECONNECT_DELAY_MS = 3000;

// Scope-gated on the frontend: polling runs only while the matching view is mounted.
// Also pauses while document.hidden (see usePageVisibility in polling hooks).
// See livePollingSlice + useLivePollingScope.

// Keep in sync with backend YAHOO_QUOTE_CACHE_TTL_MS (30s).
export const WATCHLIST_CLIENT_POLL_INTERVAL_MS = 30_000;
export const HOLDINGS_CLIENT_POLL_INTERVAL_MS = 30_000;

// Leader tab heartbeat — only one browser tab polls per user session.
export const TAB_LEADER_HEARTBEAT_MS = 2_000;
export const TAB_LEADER_TTL_MS = 5_000;

export const TICKER_CACHE_TTL_MS = 60 * 60 * 1000;

export const CURRENCY_OPTIONS = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCY_OPTIONS)[number];

export const HOLDINGS_PAGE_SIZE = 10;
export const TRANSACTIONS_PAGE_SIZE = 5;

// Reserved table heights while filtering (matches panel row metrics).
export const HOLDINGS_TABLE_HEADER_HEIGHT_PX = 44;
export const HOLDINGS_TABLE_ROW_HEIGHT_PX = 58;
export const WATCHLIST_TABLE_HEADER_HEIGHT_PX = 44;
export const WATCHLIST_TABLE_ROW_HEIGHT_PX = 52;

export const EQUITY_PERIODS = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
] as const;

export const PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD = 85;
export const PORTFOLIO_ALIGNMENT_MODERATE_THRESHOLD = 60;

export const DASHBOARD_NEWS_INITIAL_VISIBLE = 6;
export const DASHBOARD_NEWS_LOAD_MORE_STEP = 6;
/** Locked dashboard panel height so load does not push sibling rows (CLS). */
export const DASHBOARD_PANEL_HEIGHT_PX = 520;
/** Placeholder sector rows while alignment data hydrates — matches All-Weather buckets. */
export const DASHBOARD_HEALTH_SECTOR_PLACEHOLDER_COUNT = 5;
export const TICKER_AVATAR_SIZE_PX = {
  xs: 18,
  sm: 24,
  md: 30,
} as const;
export const NEWS_PAGE_INITIAL_VISIBLE = 12;
export const NEWS_PAGE_LOAD_MORE_STEP = 10;

export const AI_NEWS_SUMMARY_MAX_TICKERS = 5;
export const AI_NEWS_SUMMARY_MIN_TICKERS = 1;
export const THEME_STORAGE_KEY = 'krepton_theme';
export const THEME_OPTIONS = ['dark', 'light'] as const;
export const PREFERS_COLOR_SCHEME_LIGHT_QUERY = '(prefers-color-scheme: light)';

// Fallback when Yahoo logo is missing or blocked (e.g. adblock on "visa" CDN paths).
export const FMP_STOCK_LOGO_URL_TEMPLATE =
  'https://financialmodelingprep.com/image-stock/{ticker}.png';
export type Theme = (typeof THEME_OPTIONS)[number];
/** Used only when OS preference cannot be read. */
export const DEFAULT_THEME: Theme = 'dark';

export const AI_NEWS_BRIEFING_SESSION_STORAGE_KEY = 'krepton_ai_news_briefing_v2';
export const AI_NEWS_BRIEFING_SP500_TICKER = 'SPY';
export const AI_NEWS_BRIEFING_SP500_LABEL = 'S&P 500';
export const AI_NEWS_BRIEFING_COST_BASIS_TOOLTIP =
  'Adds your position size, average buy price, and unrealized P/L to the AI prompt for more personalized insights. Only data for the selected tickers is sent — no email, account IDs, or other personal information.';

export const STOCK_COMPARE_MAX_TICKERS = 4;
export const STOCK_COMPARE_MIN_TICKERS = 2;
export const STOCK_SEARCH_DEBOUNCE_MS = 350;
export const HEADER_TICKER_SEARCH_MAX_RESULTS = 8;
export const HEADER_TICKER_SEARCH_INPUT_ID = 'header-ticker-search';
export const HEADER_TICKER_SEARCH_INPUT_NAME = 'ticker';
export const STOCK_SEARCH_DROPDOWN_LIMIT = 8;
export const MARKET_MOVERS_COUNT = 10;

export const BACKTEST_MAX_TICKERS = 4;
export const BACKTEST_MIN_TICKERS = 1;
export const BACKTEST_DEFAULT_AMOUNT = 1000;
export const BACKTEST_MIN_AMOUNT = 1;
export const BACKTEST_MAX_AMOUNT = 10_000_000;
export const BACKTEST_BENCHMARK_LABEL = 'S&P 500';
export const BACKTEST_ALLOCATION_TOTAL_PERCENT = 100;
export const BACKTEST_ALLOCATION_TOLERANCE = 0.01;

export const BACKTEST_PERIODS = [
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
  { value: '10y', label: '10Y' },
] as const;

export type BacktestPeriod = (typeof BACKTEST_PERIODS)[number]['value'];

export const ERROR_MESSAGES = {
  UNKNOWN: 'Something went wrong. Please try again.',
  APP_RENDER_FAILED:
    'This page ran into an unexpected error. You can try again without leaving the app.',
  NETWORK: 'Unable to connect. Check your internet connection and try again.',
  TIMEOUT: 'The request timed out. Please try again.',
  SERVER: 'The service is temporarily unavailable. Please try again later.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'This action conflicts with existing data.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  AUTH_LOGIN_FAILED: 'Unable to sign in. Please check your credentials and try again.',
  AUTH_REGISTER_FAILED: 'Unable to create your account. Please try again.',
  AUTH_GOOGLE_LOGIN_FAILED: 'Unable to sign in with Google. Please try again.',
  AUTH_GOOGLE_REQUIRES_TERMS:
    'Agree to the Terms of Service and Privacy Policy to continue with Google.',
  AUTH_VERIFY_EMAIL_FAILED: 'Unable to verify your email. The link may be invalid or expired.',
  AUTH_RESEND_VERIFICATION_FAILED: 'Unable to resend verification email. Please try again.',
  AUTH_CHANGE_PASSWORD_FAILED: 'Unable to change password. Please try again.',
  AUTH_GOOGLE_STEP_UP_FAILED: 'Unable to confirm with Google. Please try again.',
  AUTH_DELETE_ACCOUNT_FAILED: 'Unable to delete your account. Please try again.',
  AUTH_FORGOT_PASSWORD_FAILED: 'Unable to send password reset instructions. Please try again.',
  AUTH_RESET_PASSWORD_FAILED: 'Unable to reset password. The link may be invalid or expired.',
  PORTFOLIO_LOAD_FAILED: 'Unable to load portfolio data. Please try again.',
  PORTFOLIO_DELETE_DATA_FAILED: 'Unable to delete portfolio data. Please try again.',
  PORTFOLIO_EXPORT_FAILED: 'Unable to export portfolio data. Please try again.',
  PORTFOLIO_NEWS_FAILED: 'Unable to load portfolio news. Please try again.',
  AI_NEWS_SUMMARY_FAILED: 'Unable to generate AI news summary. Please try again.',
  AI_NEWS_SUMMARY_QUOTA_FAILED: 'Unable to load AI quota. Please try again.',
  PORTFOLIO_POSITION_ADD_FAILED: 'Unable to add the position. Please try again.',
  PORTFOLIO_POSITION_CLOSE_FAILED: 'Unable to close the position. Please try again.',
  PORTFOLIO_POSITION_DELETE_FAILED: 'Unable to delete the position. Please try again.',
  PORTFOLIO_TRANSACTION_DELETE_FAILED: 'Unable to remove the purchase. Please try again.',
  WATCHLIST_LOAD_FAILED: 'Unable to load watchlist. Please try again.',
  WATCHLIST_ADD_FAILED: 'Unable to add the ticker. Please try again.',
  WATCHLIST_DELETE_FAILED: 'Unable to remove the ticker. Please try again.',
  IMPORT_PREVIEW_FAILED: 'Unable to read the broker file. Please check the format and try again.',
  IMPORT_CONFIRM_FAILED: 'Unable to complete the import. Please try again.',
  BROKER_SYNC_CONNECT_FAILED: 'Unable to open the brokerage connection portal. Please try again.',
  BROKER_SYNC_PREVIEW_FAILED: 'Unable to load connected holdings. Please try again.',
  BROKER_SYNC_CONFIRM_FAILED: 'Unable to sync connected holdings. Please try again.',
  BROKER_SYNC_LIST_FAILED: 'Unable to load connected brokerages. Please try again.',
  BROKER_SYNC_DISCONNECT_FAILED: 'Unable to disconnect that brokerage. Please try again.',
  SNAPTRADE_NOT_CONFIGURED:
    'Broker sync is not configured on this server yet. Upload a statement or ask an admin for Plus.',
  STOCK_SEARCH_FAILED: 'Unable to search tickers right now. Please try again.',
  STOCK_COMPARE_FAILED: 'Unable to load comparison data. Please try again.',
  STOCK_MOVERS_FAILED: 'Unable to load market movers. Please try again.',
  STOCK_BACKTEST_FAILED: 'Unable to run backtest. Please try again.',
  STOCK_TICKER_LOAD_FAILED: 'Unable to load ticker details. Please try again.',
  STOCK_TICKER_NEWS_FAILED: 'Unable to load news for this ticker. Please try again.',
  STOCK_INVALID_TICKER: 'That ticker symbol looks invalid.',
  DIVIDEND_CALENDAR_FAILED: 'Unable to load dividend calendar. Please try again.',
  PORTFOLIO_REBALANCING_FAILED: 'Unable to load rebalancing analysis. Please try again.',
  PORTFOLIO_REBALANCING_SAVE_FAILED: 'Unable to save rebalancing strategy. Please try again.',
  AI_ALIGNMENT_EXPLAIN_FAILED: 'Unable to generate alignment explanation. Please try again.',
  AI_ALIGNMENT_EXPLAIN_QUOTA_FAILED: 'Unable to load AI quota. Please try again.',
  AI_TICKER_CHAT_FAILED: 'Unable to get an AI reply. Please try again.',
  AI_TICKER_CHAT_QUOTA_FAILED: 'Unable to load AI chat quota. Please try again.',
  AI_TICKER_CHAT_EMPTY_MESSAGE: 'Enter a question about this ticker.',
  BILLING_CHECKOUT_FAILED: 'Unable to start checkout. Please try again.',
  BILLING_CHECKOUT_OPENED:
    'Complete payment in the Paddle window. Your plan updates automatically after confirmation.',
  BILLING_PORTAL_FAILED: 'Unable to open the billing portal. Please try again.',
  BILLING_ADMIN_GRANT_FAILED: 'Unable to grant complimentary access. Please try again.',
  BILLING_PADDLE_UNAVAILABLE: 'Paddle checkout is not configured in this browser build.',
  BILLING_NOT_CONFIGURED:
    'Paid checkout is not configured on this server yet. Complimentary access can still be granted by an admin.',
} as const;

export const AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY = 'krepton_ai_alignment_explain_v1';
export const STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY = 'krepton_strategy_drift_alert_dismissed_v1';

export {
  AI_GENERATED_HALLUCINATION_CAVEAT,
  AI_GENERATED_LABEL,
  LEGAL_AUTH_COOKIE_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_COPYRIGHT_YEAR,
  LEGAL_DOCUMENTS_PUBLIC_DIR,
  LANDING_NOT_FINANCIAL_ASSISTANT,
  LEGAL_LAST_UPDATED,
  LEGAL_NOT_INVESTMENT_ADVICE,
  LEGAL_REBALANCING_DISCLAIMER,
} from './content/legalConstants';

export const REBALANCING_ALLOCATION_TOTAL_PERCENT = 100;
export const REBALANCING_ALLOCATION_TOLERANCE = 0.01;
export const REBALANCING_CURRENT_BAR_COLOR = '#3b82f6';
export const REBALANCING_TARGET_BAR_COLOR = '#10b981';

export const REBALANCING_ASSET_CLASS_COLORS = {
  equities: '#10b981',
  lt_bonds: '#6366f1',
  it_bonds: '#3b82f6',
  gold: '#f59e0b',
  commodities: '#f97316',
} as const;

const REBALANCING_DISPLAY_COLOR_BY_HEX: Record<string, string> = {
  [REBALANCING_ASSET_CLASS_COLORS.lt_bonds]: 'var(--color-rebalancing-lt-bonds)',
};

/** Maps API bucket hex to a theme token when contrast needs a per-theme tweak. */
export function resolveRebalancingDisplayColor(hexColor: string): string {
  return REBALANCING_DISPLAY_COLOR_BY_HEX[hexColor.trim().toLowerCase()] ?? hexColor;
}
