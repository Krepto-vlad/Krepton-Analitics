export const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRICING: '/pricing',
  SECURITY: '/security',
  DASHBOARD: '/dashboard',
  PORTFOLIO: '/portfolio',
  REBALANCING: '/rebalancing',
  SCREENER: '/screener',
  BACKTESTING: '/backtesting',
  WATCHLIST: '/watchlist',
  HISTORY: '/history',
} as const;

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
  DOWN: '#ef5350',
  BACKGROUND: '#111113',
  GRID: 'rgba(255,255,255,0.04)',
  TEXT: '#8a8a96',
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

export const EQUITY_PERIODS = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
] as const;

export const PORTFOLIO_RISK_SCORE = 67;

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
  PORTFOLIO_LOAD_FAILED: 'Unable to load portfolio data. Please try again.',
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
} as const;
