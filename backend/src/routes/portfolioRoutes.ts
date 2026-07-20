import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getPositions,
  getTransactions,
  getEquityHistory,
  getInvestmentSummaryHandler,
  getPortfolioNewsHandler,
  getPortfolioDividendsHandler,
  getBuyTransactions,
  postPosition,
  patchPosition,
  deletePosition,
  deleteTransaction,
  postClosePosition,
} from '../controllers/portfolioController.js';
import {
  getWatchlist,
  postWatchlistItem,
  deleteWatchlistItemHandler,
} from '../controllers/watchlistController.js';
import { previewImport, confirmImport } from '../controllers/importController.js';
import { brokerImportUploadMiddleware } from '../middleware/brokerImportUpload.js';
import rateLimit from 'express-rate-limit';
import {
  PORTFOLIO_WRITE_RATE_LIMIT_WINDOW_MS,
  PORTFOLIO_WRITE_RATE_LIMIT_MAX_REQUESTS,
  IMPORT_RATE_LIMIT_WINDOW_MS,
  IMPORT_RATE_LIMIT_MAX_REQUESTS,
} from '../constants.js';

// Apply rate limiting only to write operations to prevent abuse
const portfolioWriteLimiter = rateLimit({
  windowMs: PORTFOLIO_WRITE_RATE_LIMIT_WINDOW_MS,
  max: PORTFOLIO_WRITE_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const importLimiter = rateLimit({
  windowMs: IMPORT_RATE_LIMIT_WINDOW_MS,
  max: IMPORT_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many import attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// All portfolio routes require a valid JWT HttpOnly cookie
router.use(authMiddleware);

router.get('/', asyncHandler(getPositions));
router.get('/transactions', asyncHandler(getTransactions));
router.get('/equity-history', asyncHandler(getEquityHistory));
router.get('/investment-summary', asyncHandler(getInvestmentSummaryHandler));
router.get('/news', asyncHandler(getPortfolioNewsHandler));
router.get('/dividends', asyncHandler(getPortfolioDividendsHandler));
router.post(
  '/import/preview',
  importLimiter,
  brokerImportUploadMiddleware,
  asyncHandler(previewImport)
);
router.post('/import/confirm', importLimiter, portfolioWriteLimiter, asyncHandler(confirmImport));
router.get('/watchlist', asyncHandler(getWatchlist));
router.post('/watchlist', portfolioWriteLimiter, asyncHandler(postWatchlistItem));
router.delete(
  '/watchlist/:itemId',
  portfolioWriteLimiter,
  asyncHandler(deleteWatchlistItemHandler)
);
router.get('/buys/:ticker', asyncHandler(getBuyTransactions));
router.delete(
  '/transactions/:transactionId',
  portfolioWriteLimiter,
  asyncHandler(deleteTransaction)
);
router.post('/', portfolioWriteLimiter, asyncHandler(postPosition));
router.patch('/:positionId', portfolioWriteLimiter, asyncHandler(patchPosition));
router.delete('/:positionId', portfolioWriteLimiter, asyncHandler(deletePosition));
router.post('/:positionId/close', portfolioWriteLimiter, asyncHandler(postClosePosition));

export default router;
