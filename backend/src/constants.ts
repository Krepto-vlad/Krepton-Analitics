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
} as const;

export const WS_QUOTE_POLL_INTERVAL_MS = 5000;
export const WS_MAX_SUBSCRIPTIONS_PER_CLIENT = 5;
