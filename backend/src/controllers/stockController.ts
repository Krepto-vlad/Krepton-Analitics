import type { Request, Response } from 'express';
import {
  getStockQuote,
  getStockQuotes,
  getStockHistory,
  getStockSector,
  searchStocks,
  getTickerTapeQuotes,
  getStockCompare,
  getStockFundamentals,
} from '../services/stockService.js';
import { getMarketMovers } from '../services/marketMoversService.js';
import { getPortfolioNews } from '../services/newsService.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  HISTORICAL_DATA_PERIODS,
  HISTORICAL_DATA_INTERVALS,
  TICKER_TAPE_BROWSER_CACHE_TTL_S,
  QUOTE_BATCH_BROWSER_CACHE_TTL_S,
  YAHOO_QUOTE_BATCH_MAX_SIZE,
  STOCK_COMPARE_MAX_TICKERS,
  STOCK_COMPARE_MIN_TICKERS,
  STOCK_HISTORY_BROWSER_CACHE_TTL_S,
  STOCK_FUNDAMENTALS_BROWSER_CACHE_TTL_S,
  STOCK_NEWS_BROWSER_CACHE_TTL_S,
  MARKET_MOVERS_BROWSER_CACHE_TTL_S,
  BACKTEST_MAX_TICKERS,
  BACKTEST_MIN_TICKERS,
  BACKTEST_MIN_AMOUNT,
  BACKTEST_MAX_AMOUNT,
  BACKTEST_DEFAULT_AMOUNT,
  BACKTEST_ALLOCATION_TOTAL_PERCENT,
  BACKTEST_ALLOCATION_TOLERANCE,
} from '../constants.js';
import type {
  ApiResponse,
  StockQuote,
  StockHistoryResponse,
  StockSearchResult,
  StockSector,
  StockCompareItem,
  StockCompareResponse,
  StockBacktestResponse,
  MarketMoversResponse,
} from '../types/stock.types.js';
import type { PortfolioNewsItem } from '../types/news.types.js';
import { isBacktestPeriod, runStockBacktest } from '../services/backtestService.js';
import { parseDisplayCurrency } from '../utils/displayCurrency.js';
import { isValidTickerSymbol, normalizeTickerSymbol } from '../utils/tickerValidation.js';

function parseTickerParam(rawTicker: string): string {
  const normalizedTicker = normalizeTickerSymbol(rawTicker);
  if (!isValidTickerSymbol(normalizedTicker)) {
    throw new AppError(400, 'Invalid ticker symbol');
  }
  return normalizedTicker;
}

const VALID_PERIODS = Object.values(HISTORICAL_DATA_PERIODS) as string[];
const VALID_INTERVALS = Object.values(HISTORICAL_DATA_INTERVALS) as string[];

export async function getQuote(
  req: Request,
  res: Response<ApiResponse<StockQuote>>
): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const quote = await getStockQuote(ticker.toUpperCase());
  res.json({ success: true, data: quote });
}

export async function getQuotes(
  req: Request,
  res: Response<ApiResponse<StockQuote[]>>
): Promise<void> {
  const rawTickers = req.query.tickers as string | undefined;

  if (!rawTickers || rawTickers.trim().length === 0) {
    throw new AppError(400, 'Query parameter "tickers" is required');
  }

  const tickers = [
    ...new Set(
      rawTickers
        .split(',')
        .map((ticker) => ticker.trim().toUpperCase())
        .filter((ticker) => ticker.length > 0)
    ),
  ];

  if (tickers.length === 0) {
    throw new AppError(400, 'At least one ticker is required');
  }

  if (tickers.length > YAHOO_QUOTE_BATCH_MAX_SIZE) {
    throw new AppError(
      400,
      `Cannot request more than ${YAHOO_QUOTE_BATCH_MAX_SIZE} tickers at once`
    );
  }

  const quotes = await getStockQuotes(tickers);
  res.set('Cache-Control', `private, max-age=${QUOTE_BATCH_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: quotes });
}

export async function getHistory(
  req: Request,
  res: Response<ApiResponse<StockHistoryResponse>>
): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const period = (req.query.period as string) ?? HISTORICAL_DATA_PERIODS.ONE_YEAR;
  const interval = (req.query.interval as string) ?? HISTORICAL_DATA_INTERVALS.ONE_DAY;

  if (!VALID_PERIODS.includes(period)) {
    throw new AppError(400, `Invalid period. Valid: ${VALID_PERIODS.join(', ')}`);
  }
  if (!VALID_INTERVALS.includes(interval)) {
    throw new AppError(400, `Invalid interval. Valid: ${VALID_INTERVALS.join(', ')}`);
  }

  const normalizedTicker = parseTickerParam(ticker);
  const history = await getStockHistory(normalizedTicker, period, interval);
  res.set('Cache-Control', `private, max-age=${STOCK_HISTORY_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: history });
}

export async function getFundamentals(
  req: Request,
  res: Response<ApiResponse<StockCompareItem>>
): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const normalizedTicker = parseTickerParam(ticker);
  const fundamentals = await getStockFundamentals(normalizedTicker);
  res.set('Cache-Control', `private, max-age=${STOCK_FUNDAMENTALS_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: fundamentals });
}

export async function getTickerNews(
  req: Request,
  res: Response<ApiResponse<PortfolioNewsItem[]>>
): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const normalizedTicker = parseTickerParam(ticker);
  const news = await getPortfolioNews([normalizedTicker]);
  res.set('Cache-Control', `private, max-age=${STOCK_NEWS_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: news });
}

export function getTickerTape(_req: Request, res: Response<ApiResponse<StockQuote[]>>): void {
  res.set('Cache-Control', `public, max-age=${TICKER_TAPE_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: getTickerTapeQuotes() });
}

export async function getSectorForTicker(
  req: Request,
  res: Response<ApiResponse<StockSector>>
): Promise<void> {
  const ticker = (req.params as { ticker: string }).ticker;
  const result = await getStockSector(ticker.toUpperCase());
  res.json({ success: true, data: result });
}

export async function getMovers(
  _req: Request,
  res: Response<ApiResponse<MarketMoversResponse>>
): Promise<void> {
  const movers = await getMarketMovers();
  res.set('Cache-Control', `public, max-age=${MARKET_MOVERS_BROWSER_CACHE_TTL_S}`);
  res.json({ success: true, data: movers });
}

export async function getCompare(
  req: Request,
  res: Response<ApiResponse<StockCompareResponse>>
): Promise<void> {
  const rawTickers = req.query.tickers as string | undefined;

  if (!rawTickers || rawTickers.trim().length === 0) {
    throw new AppError(400, 'Query parameter "tickers" is required');
  }

  const tickers = [
    ...new Set(
      rawTickers
        .split(',')
        .map((ticker) => ticker.trim().toUpperCase())
        .filter((ticker) => ticker.length > 0)
    ),
  ];

  if (tickers.length < STOCK_COMPARE_MIN_TICKERS) {
    throw new AppError(
      400,
      `At least ${STOCK_COMPARE_MIN_TICKERS} tickers are required for comparison`
    );
  }

  if (tickers.length > STOCK_COMPARE_MAX_TICKERS) {
    throw new AppError(
      400,
      `Cannot compare more than ${STOCK_COMPARE_MAX_TICKERS} tickers at once`
    );
  }

  const comparison = await getStockCompare(tickers);
  res.json({ success: true, data: comparison });
}

export async function getBacktest(
  req: Request,
  res: Response<ApiResponse<StockBacktestResponse>>
): Promise<void> {
  const rawTickers = req.query.tickers as string | undefined;
  const rawWeights = req.query.weights as string | undefined;
  const period = ((req.query.period as string) ?? '3y').toLowerCase();
  const rawAmount = req.query.amount as string | undefined;

  if (!rawTickers || rawTickers.trim().length === 0) {
    throw new AppError(400, 'Query parameter "tickers" is required');
  }

  if (!isBacktestPeriod(period)) {
    throw new AppError(400, 'Invalid period. Valid: 1y, 3y, 5y, 10y');
  }

  const tickers = rawTickers
    .split(',')
    .map((ticker) => ticker.trim().toUpperCase())
    .filter((ticker) => ticker.length > 0);

  if (tickers.length < BACKTEST_MIN_TICKERS) {
    throw new AppError(400, 'At least one ticker is required');
  }

  if (tickers.length > BACKTEST_MAX_TICKERS) {
    throw new AppError(400, `Cannot backtest more than ${BACKTEST_MAX_TICKERS} tickers at once`);
  }

  const uniqueTickers = new Set(tickers);
  if (uniqueTickers.size !== tickers.length) {
    throw new AppError(400, 'Duplicate tickers are not allowed');
  }

  let weights: number[];
  if (rawWeights && rawWeights.trim().length > 0) {
    weights = rawWeights
      .split(',')
      .map((weight) => Number(weight.trim()))
      .filter((weight) => !Number.isNaN(weight));
  } else if (tickers.length === 1) {
    weights = [BACKTEST_ALLOCATION_TOTAL_PERCENT];
  } else {
    throw new AppError(400, 'Query parameter "weights" is required for multi-ticker portfolios');
  }

  if (weights.length !== tickers.length) {
    throw new AppError(400, 'Tickers and weights must have the same length');
  }

  if (weights.some((weight) => weight <= 0)) {
    throw new AppError(400, 'Each allocation weight must be greater than 0');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - BACKTEST_ALLOCATION_TOTAL_PERCENT) > BACKTEST_ALLOCATION_TOLERANCE) {
    throw new AppError(400, 'Allocation weights must sum to 100%');
  }

  const amount = rawAmount != null ? Number(rawAmount) : BACKTEST_DEFAULT_AMOUNT;
  if (!Number.isFinite(amount) || amount < BACKTEST_MIN_AMOUNT || amount > BACKTEST_MAX_AMOUNT) {
    throw new AppError(
      400,
      `Amount must be between ${BACKTEST_MIN_AMOUNT} and ${BACKTEST_MAX_AMOUNT}`
    );
  }

  const allocations = tickers.map((ticker, index) => ({
    ticker,
    weightPercent: weights[index],
  }));

  const displayCurrency = parseDisplayCurrency(req.query.displayCurrency);

  const backtest = await runStockBacktest({ allocations, period, amount, displayCurrency });
  res.json({ success: true, data: backtest });
}

export async function searchTickers(
  req: Request,
  res: Response<ApiResponse<StockSearchResult[]>>
): Promise<void> {
  const query = req.query.q as string;

  if (!query || query.trim().length === 0) {
    throw new AppError(400, 'Query parameter "q" is required');
  }

  const results = await searchStocks(query.trim());
  res.json({ success: true, data: results });
}
