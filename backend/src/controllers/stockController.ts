import type { Request, Response } from 'express';
import { getStockQuote, getStockHistory, searchStocks } from '../services/stockService.js';
import { AppError } from '../middleware/errorHandler.js';
import { HISTORICAL_DATA_PERIODS, HISTORICAL_DATA_INTERVALS } from '../constants.js';
import type {
  ApiResponse,
  StockQuote,
  StockHistoryResponse,
  StockSearchResult,
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
