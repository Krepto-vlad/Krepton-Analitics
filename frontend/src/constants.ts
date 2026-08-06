export const API_BASE_URL = import.meta.env.VITE_API_URL as string;
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PRICING: '/pricing',
  SECURITY: '/security',
  DASHBOARD: '/dashboard',
  PORTFOLIO: '/portfolio',
  PROFILE: '/profile',
  SUBSCRIPTION: '/subscription',
  REBALANCING: '/rebalancing',
  SCREENER: '/screener',
  BACKTESTING: '/backtesting',
  DIVIDENDS: '/dividends',
  NEWS: '/news',
  WATCHLIST: '/watchlist',
} as const;

/** React Router location.state flag: scroll landing page to #features after navigation. */
export const LANDING_SCROLL_TO_FEATURES_STATE = { scrollToFeatures: true } as const;

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
} as const;

export const DEFAULT_TICKER = 'AAPL';
export const DEFAULT_PERIOD = '1y';
export const DEFAULT_INTERVAL = '1d';

export const WS_RECONNECT_DELAY_MS = 3000;

// Scope-gated on the frontend: polling runs only while the matching view is mounted.
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
  STOCK_SEARCH_FAILED: 'Unable to search tickers right now. Please try again.',
  STOCK_COMPARE_FAILED: 'Unable to load comparison data. Please try again.',
  STOCK_MOVERS_FAILED: 'Unable to load market movers. Please try again.',
  STOCK_BACKTEST_FAILED: 'Unable to run backtest. Please try again.',
  DIVIDEND_CALENDAR_FAILED: 'Unable to load dividend calendar. Please try again.',
  PORTFOLIO_REBALANCING_FAILED: 'Unable to load rebalancing analysis. Please try again.',
  PORTFOLIO_REBALANCING_SAVE_FAILED: 'Unable to save rebalancing strategy. Please try again.',
  AI_ALIGNMENT_EXPLAIN_FAILED: 'Unable to generate alignment explanation. Please try again.',
  AI_ALIGNMENT_EXPLAIN_QUOTA_FAILED: 'Unable to load AI quota. Please try again.',
} as const;

export const AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY = 'krepton_ai_alignment_explain_v1';

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
