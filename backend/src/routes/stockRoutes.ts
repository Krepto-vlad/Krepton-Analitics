import { Router } from 'express';
import {
  getQuote,
  getQuotes,
  getHistory,
  getSectorForTicker,
  searchTickers,
  getTickerTape,
  getCompare,
  getBacktest,
} from '../controllers/stockController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Synchronous handler — data always in memory, no async needed
router.get('/ticker-tape', getTickerTape);
router.get('/search', asyncHandler(searchTickers));
router.get('/quotes', asyncHandler(getQuotes));
router.get('/compare', asyncHandler(getCompare));
router.get('/backtest', asyncHandler(getBacktest));
router.get('/quote/:ticker', asyncHandler(getQuote));
router.get('/sector/:ticker', asyncHandler(getSectorForTicker));
router.get('/history/:ticker', asyncHandler(getHistory));

export default router;
