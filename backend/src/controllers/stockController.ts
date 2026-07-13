import type { Request, Response } from 'express';
import {
  getStockQuote,
  getStockQuotes,
  getStockHistory,
  getStockSector,
  searchStocks,
  getTickerTapeQuotes,
} from '../services/stockService.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  HISTORICAL_DATA_PERIODS,
  HISTORICAL_DATA_INTERVALS,
  TICKER_TAPE_BROWSER_CACHE_TTL_S,
  QUOTE_BATCH_BROWSER_CACHE_TTL_S,
  YAHOO_QUOTE_BATCH_MAX_SIZE,
} from '../constants.js';
import type {
  ApiResponse,
  StockQuote,
  StockHistoryResponse,
  StockSearchResult,
  StockSector,
} from '../types/stock.types.js';

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

  const history = await getStockHistory(ticker.toUpperCase(), period, interval);
  res.json({ success: true, data: history });
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
