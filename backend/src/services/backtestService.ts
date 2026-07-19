import {
  BACKTEST_BENCHMARK_LABEL,
  BACKTEST_BENCHMARK_TICKER,
  BACKTEST_HISTORY_CACHE_TTL_MS,
  BACKTEST_PERIODS,
  HISTORICAL_DATA_INTERVALS,
  type BacktestPeriod,
} from '../constants.js';
import type {
  OhlcvCandle,
  StockBacktestBenchmarkResult,
  StockBacktestHoldingResult,
  StockBacktestPeriodBreakdown,
  StockBacktestPortfolioResult,
  StockBacktestResponse,
} from '../types/stock.types.js';
import type { DisplayCurrency } from '../types/fx.types.js';
import { getCachedStockQuote, getCachedStockQuotes } from './quoteCacheService.js';
import { getStockHistory } from './stockService.js';

export interface BacktestAllocationInput {
  ticker: string;
  weightPercent: number;
}

const BACKTEST_PERIOD_LABELS: Record<BacktestPeriod, string> = {
  '1y': '1Y',
  '3y': '3Y',
  '5y': '5Y',
  '10y': '10Y',
};

const historyCache = new Map<string, { candles: OhlcvCandle[]; expiresAt: number }>();

function buildHistoryCacheKey(ticker: string, period: string): string {
  return `${ticker.toUpperCase()}:${period}`;
}

async function getCachedHistoryCandles(ticker: string, period: string): Promise<OhlcvCandle[]> {
  const upperTicker = ticker.toUpperCase();
  const cacheKey = buildHistoryCacheKey(upperTicker, period);
  const cached = historyCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.candles;
  }

  const history = await getStockHistory(upperTicker, period, HISTORICAL_DATA_INTERVALS.ONE_DAY);

  historyCache.set(cacheKey, {
    candles: history.candles,
    expiresAt: Date.now() + BACKTEST_HISTORY_CACHE_TTL_MS,
  });

  return history.candles;
}

function computeGrowthFactor(candles: OhlcvCandle[]): number {
  if (candles.length < 2) {
    throw new Error('Not enough historical data for backtest');
  }

  const sortedCandles = [...candles].sort((left, right) => left.time - right.time);
  const firstClose = sortedCandles[0].close;
  const lastClose = sortedCandles[sortedCandles.length - 1].close;

  if (!Number.isFinite(firstClose) || !Number.isFinite(lastClose) || firstClose <= 0) {
    throw new Error('Invalid historical price data for backtest');
  }

  return lastClose / firstClose;
}

async function getTickerGrowthFactor(ticker: string, period: string): Promise<number> {
  const candles = await getCachedHistoryCandles(ticker, period);
  return computeGrowthFactor(candles);
}

async function computePortfolioBacktest(
  allocations: BacktestAllocationInput[],
  period: string,
  totalAmount: number,
  displayCurrency: DisplayCurrency,
  quoteMap: Map<string, { name: string; currency: string }>
): Promise<{ portfolio: StockBacktestPortfolioResult; holdings: StockBacktestHoldingResult[] }> {
  const holdings = await Promise.all(
    allocations.map(async (allocation) => {
      const upperTicker = allocation.ticker.toUpperCase();
      const growthFactor = await getTickerGrowthFactor(upperTicker, period);
      const allocatedAmount = totalAmount * (allocation.weightPercent / 100);
      const contributionValue = allocatedAmount * growthFactor;
      const quote = quoteMap.get(upperTicker);
      const fallbackQuote = await getCachedStockQuote(upperTicker).catch(() => null);

      return {
        ticker: upperTicker,
        name: quote?.name ?? fallbackQuote?.name ?? upperTicker,
        currency: displayCurrency,
        weightPercent: allocation.weightPercent,
        allocatedAmount,
        returnPercent: (growthFactor - 1) * 100,
        contributionValue,
      };
    })
  );

  const finalValue = holdings.reduce((sum, holding) => sum + holding.contributionValue, 0);

  return {
    portfolio: {
      finalValue,
      returnPercent: (finalValue / totalAmount - 1) * 100,
      currency: displayCurrency,
    },
    holdings,
  };
}

async function computeBenchmarkBacktest(
  period: string,
  totalAmount: number,
  displayCurrency: DisplayCurrency
): Promise<StockBacktestBenchmarkResult> {
  const growthFactor = await getTickerGrowthFactor(BACKTEST_BENCHMARK_TICKER, period);

  return {
    label: BACKTEST_BENCHMARK_LABEL,
    ticker: BACKTEST_BENCHMARK_TICKER,
    returnPercent: (growthFactor - 1) * 100,
    finalValue: totalAmount * growthFactor,
    currency: displayCurrency,
  };
}

export async function runStockBacktest(params: {
  allocations: BacktestAllocationInput[];
  period: BacktestPeriod;
  amount: number;
  displayCurrency: DisplayCurrency;
}): Promise<StockBacktestResponse> {
  const normalizedAllocations = params.allocations.map((allocation) => ({
    ticker: allocation.ticker.toUpperCase(),
    weightPercent: allocation.weightPercent,
  }));

  const tickers = normalizedAllocations.map((allocation) => allocation.ticker);
  const quotes = await getCachedStockQuotes(tickers);
  const quoteMap = new Map(
    quotes.map((quote) => [quote.ticker, { name: quote.name, currency: quote.currency }])
  );

  const { portfolio, holdings } = await computePortfolioBacktest(
    normalizedAllocations,
    params.period,
    params.amount,
    params.displayCurrency,
    quoteMap
  );

  const benchmark = await computeBenchmarkBacktest(
    params.period,
    params.amount,
    params.displayCurrency
  );

  const periodBreakdown: StockBacktestPeriodBreakdown[] = await Promise.all(
    BACKTEST_PERIODS.map(async (breakdownPeriod) => {
      const [portfolioMetrics, benchmarkMetrics] = await Promise.all([
        computePortfolioBacktest(
          normalizedAllocations,
          breakdownPeriod,
          params.amount,
          params.displayCurrency,
          quoteMap
        ),
        computeBenchmarkBacktest(breakdownPeriod, params.amount, params.displayCurrency),
      ]);

      return {
        period: breakdownPeriod,
        label: BACKTEST_PERIOD_LABELS[breakdownPeriod],
        portfolioReturnPercent: portfolioMetrics.portfolio.returnPercent,
        benchmarkReturnPercent: benchmarkMetrics.returnPercent,
      };
    })
  );

  return {
    amount: params.amount,
    displayCurrency: params.displayCurrency,
    period: params.period,
    periodLabel: BACKTEST_PERIOD_LABELS[params.period],
    portfolio,
    holdings,
    benchmark,
    periodBreakdown,
  };
}

export function isBacktestPeriod(value: string): value is BacktestPeriod {
  return (BACKTEST_PERIODS as readonly string[]).includes(value);
}
