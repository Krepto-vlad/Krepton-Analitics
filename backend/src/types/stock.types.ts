export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  currency: string;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

export interface OhlcvCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryResponse {
  ticker: string;
  interval: string;
  candles: OhlcvCandle[];
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export interface StockSector {
  sector: string;
  industry: string;
}

export interface StockCompareItem {
  ticker: string;
  name: string;
  currency: string;
  price: number | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  trailingEps: number | null;
  peRatio: number | null;
  forwardPeRatio: number | null;
  pegRatio: number | null;
  psRatio: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  roe: number | null;
  roa: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;
}

export interface StockCompareResponse {
  tickers: string[];
  items: StockCompareItem[];
}

export interface StockBacktestHoldingResult {
  ticker: string;
  name: string;
  currency: string;
  weightPercent: number;
  allocatedAmount: number;
  returnPercent: number;
  contributionValue: number;
}

export interface StockBacktestPortfolioResult {
  returnPercent: number;
  finalValue: number;
  currency: string;
}

export interface StockBacktestBenchmarkResult {
  label: string;
  ticker: string;
  returnPercent: number;
  finalValue: number;
  currency: string;
}

export interface StockBacktestPeriodBreakdown {
  period: string;
  label: string;
  portfolioReturnPercent: number;
  benchmarkReturnPercent: number;
}

export interface StockBacktestResponse {
  amount: number;
  displayCurrency: string;
  period: string;
  periodLabel: string;
  portfolio: StockBacktestPortfolioResult;
  holdings: StockBacktestHoldingResult[];
  benchmark: StockBacktestBenchmarkResult;
  periodBreakdown: StockBacktestPeriodBreakdown[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
