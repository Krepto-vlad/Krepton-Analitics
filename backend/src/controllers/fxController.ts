import type { Request, Response } from 'express';
import { getFxRate, getFxRatesForRange } from '../services/fxRateService.js';
import { assertIsoDate, parseDisplayCurrency } from '../utils/displayCurrency.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getFxRateHandler(req: Request, res: Response): Promise<void> {
  const { from, to, date } = req.query;

  if (typeof from !== 'string' || typeof to !== 'string' || typeof date !== 'string') {
    throw new AppError(400, 'from, to and date query parameters are required');
  }

  assertIsoDate(date, 'date');

  const baseCurrency = parseDisplayCurrency(from);
  const quoteCurrency = parseDisplayCurrency(to);
  const rate = await getFxRate(baseCurrency, quoteCurrency, date);

  res.json({ success: true, data: rate });
}

export async function getFxRatesRangeHandler(req: Request, res: Response): Promise<void> {
  const { from, to, fromDate, toDate } = req.query;

  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    typeof fromDate !== 'string' ||
    typeof toDate !== 'string'
  ) {
    throw new AppError(400, 'from, to, fromDate and toDate query parameters are required');
  }

  assertIsoDate(fromDate, 'fromDate');
  assertIsoDate(toDate, 'toDate');

  const baseCurrency = parseDisplayCurrency(from);
  const quoteCurrency = parseDisplayCurrency(to);
  const rates = await getFxRatesForRange(baseCurrency, quoteCurrency, fromDate, toDate);

  res.json({ success: true, data: rates });
}
