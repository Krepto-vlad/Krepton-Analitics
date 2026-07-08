export const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRICING: '/pricing',
  SECURITY: '/security',
  DASHBOARD: '/dashboard',
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

export const TICKER_CACHE_TTL_MS = 60 * 60 * 1000;

export const CURRENCY_OPTIONS = ['USD', 'EUR'] as const;
export type Currency = (typeof CURRENCY_OPTIONS)[number];

export const EQUITY_PERIODS = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
] as const;

export const PORTFOLIO_RISK_SCORE = 67;
