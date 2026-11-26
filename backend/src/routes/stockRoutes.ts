import { Router } from 'express';
import {
  getQuote,
  getQuotes,
  getHistory,
  getFundamentals,
  getTickerNews,
  getSectorForTicker,
  getAssetClassForTicker,
  searchTickers,
  getTickerTape,
  getCompare,
  getMovers,
  getBacktest,
} from '../controllers/stockController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Synchronous handler — data always in memory, no async needed
router.get('/ticker-tape', getTickerTape);
router.get('/search', asyncHandler(searchTickers));
router.get('/quotes', asyncHandler(getQuotes));
router.get('/movers', asyncHandler(getMovers));
router.get('/compare', asyncHandler(getCompare));
router.get('/backtest', asyncHandler(getBacktest));
router.get('/quote/:ticker', asyncHandler(getQuote));
router.get('/sector/:ticker', asyncHandler(getSectorForTicker));
router.get('/asset-class/:ticker', asyncHandler(getAssetClassForTicker));
router.get('/fundamentals/:ticker', asyncHandler(getFundamentals));
router.get('/news/:ticker', asyncHandler(getTickerNews));
router.get('/history/:ticker', asyncHandler(getHistory));

export default router;
