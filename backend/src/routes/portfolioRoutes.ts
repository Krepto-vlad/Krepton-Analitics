import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getPositions,
  getTransactions,
  getEquityHistory,
  getInvestmentSummaryHandler,
  getPortfolioNewsHandler,
  getNewsSummaryQuotaHandler,
  postNewsSummaryHandler,
  getAlignmentExplanationQuotaHandler,
  postAlignmentExplanationHandler,
  getTickerChatQuotaHandler,
  postTickerChatHandler,
  getPortfolioDividendsHandler,
  getPortfolioRebalancingHandler,
  getRebalancingStrategiesHandler,
  updatePortfolioRebalancingHandler,
  getBuyTransactions,
  getTickerTransactions,
  deletePortfolioDataHandler,
  exportPortfolioDataHandler,
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
import {
  connectBrokerSync,
  previewBrokerSync,
  confirmBrokerSync,
  listBrokerSync,
  disconnectBrokerSync,
} from '../controllers/brokerSyncController.js';
import { paidMiddleware } from '../middleware/paidMiddleware.js';
import { brokerImportUploadMiddleware } from '../middleware/brokerImportUpload.js';
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import {
  PORTFOLIO_READ_RATE_LIMIT_WINDOW_MS,
  PORTFOLIO_READ_RATE_LIMIT_MAX_REQUESTS,
  PORTFOLIO_WRITE_RATE_LIMIT_WINDOW_MS,
  PORTFOLIO_WRITE_RATE_LIMIT_MAX_REQUESTS,
  PORTFOLIO_EXPORT_RATE_LIMIT_WINDOW_MS,
  PORTFOLIO_EXPORT_RATE_LIMIT_MAX_REQUESTS,
  IMPORT_RATE_LIMIT_WINDOW_MS,
  IMPORT_RATE_LIMIT_MAX_REQUESTS,
  AI_NEWS_SUMMARY_RATE_LIMIT_WINDOW_MS,
  AI_NEWS_SUMMARY_RATE_LIMIT_MAX_REQUESTS,
  AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_WINDOW_MS,
  AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_MAX_REQUESTS,
  AI_TICKER_CHAT_RATE_LIMIT_WINDOW_MS,
  AI_TICKER_CHAT_RATE_LIMIT_MAX_REQUESTS,
} from '../constants.js';

// Blanket circuit breaker on every GET below — see PORTFOLIO_READ_RATE_LIMIT_* for rationale.
const portfolioReadLimiter = rateLimit({
  windowMs: PORTFOLIO_READ_RATE_LIMIT_WINDOW_MS,
  max: PORTFOLIO_READ_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `portfolio-read:${req.userId ?? 'anonymous'}`,
  validate: { keyGeneratorIpFallback: false },
});

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

const aiNewsSummaryLimiter = rateLimit({
  windowMs: AI_NEWS_SUMMARY_RATE_LIMIT_WINDOW_MS,
  max: AI_NEWS_SUMMARY_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many AI requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiExplainAlignmentLimiter = rateLimit({
  windowMs: AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_WINDOW_MS,
  max: AI_EXPLAIN_ALIGNMENT_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many AI requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiTickerChatLimiter = rateLimit({
  windowMs: AI_TICKER_CHAT_RATE_LIMIT_WINDOW_MS,
  max: AI_TICKER_CHAT_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many AI chat requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const portfolioExportLimiter = rateLimit({
  windowMs: PORTFOLIO_EXPORT_RATE_LIMIT_WINDOW_MS,
  max: PORTFOLIO_EXPORT_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many export attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `portfolio-export:${req.userId ?? 'anonymous'}`,
  validate: { keyGeneratorIpFallback: false },
});

const router = Router();

// All portfolio routes require a valid JWT HttpOnly cookie
router.use(authMiddleware);
// Blanket cap on every route below (reads and writes); the stricter write-specific
// limiters further down stack on top of this for sensitive/expensive write endpoints.
router.use(portfolioReadLimiter);

router.get('/', asyncHandler(getPositions));
router.get('/transactions', asyncHandler(getTransactions));
router.get('/equity-history', asyncHandler(getEquityHistory));
router.get('/investment-summary', asyncHandler(getInvestmentSummaryHandler));
router.get('/news', asyncHandler(getPortfolioNewsHandler));
router.get('/news/summary/quota', asyncHandler(getNewsSummaryQuotaHandler));
router.post(
  '/news/summary',
  aiNewsSummaryLimiter,
  portfolioWriteLimiter,
  asyncHandler(postNewsSummaryHandler)
);
router.get('/dividends', asyncHandler(getPortfolioDividendsHandler));
router.get('/rebalancing/strategies', asyncHandler(getRebalancingStrategiesHandler));
router.get('/rebalancing', asyncHandler(getPortfolioRebalancingHandler));
router.get('/rebalancing/explain/quota', asyncHandler(getAlignmentExplanationQuotaHandler));
router.post(
  '/rebalancing/explain',
  aiExplainAlignmentLimiter,
  portfolioWriteLimiter,
  asyncHandler(postAlignmentExplanationHandler)
);
router.get('/ticker-chat/quota', asyncHandler(getTickerChatQuotaHandler));
router.post(
  '/ticker-chat',
  aiTickerChatLimiter,
  portfolioWriteLimiter,
  asyncHandler(postTickerChatHandler)
);
router.put(
  '/rebalancing/strategy',
  portfolioWriteLimiter,
  asyncHandler(updatePortfolioRebalancingHandler)
);
router.post(
  '/import/preview',
  importLimiter,
  brokerImportUploadMiddleware,
  asyncHandler(previewImport)
);
router.post('/import/confirm', importLimiter, portfolioWriteLimiter, asyncHandler(confirmImport));
router.post('/broker-sync/connect', importLimiter, paidMiddleware, asyncHandler(connectBrokerSync));
router.post('/broker-sync/preview', importLimiter, paidMiddleware, asyncHandler(previewBrokerSync));
router.post(
  '/broker-sync/confirm',
  importLimiter,
  portfolioWriteLimiter,
  paidMiddleware,
  asyncHandler(confirmBrokerSync)
);
router.get('/broker-sync/connections', importLimiter, asyncHandler(listBrokerSync));
router.delete(
  '/broker-sync/connections/:authorizationId',
  importLimiter,
  asyncHandler(disconnectBrokerSync)
);
router.get('/watchlist', asyncHandler(getWatchlist));
router.post('/watchlist', portfolioWriteLimiter, asyncHandler(postWatchlistItem));
router.delete(
  '/watchlist/:itemId',
  portfolioWriteLimiter,
  asyncHandler(deleteWatchlistItemHandler)
);
router.get('/buys/:ticker', asyncHandler(getBuyTransactions));
router.get('/trades/:ticker', asyncHandler(getTickerTransactions));
router.delete(
  '/transactions/:transactionId',
  portfolioWriteLimiter,
  asyncHandler(deleteTransaction)
);
router.delete('/data', portfolioWriteLimiter, asyncHandler(deletePortfolioDataHandler));
router.post('/export', portfolioExportLimiter, asyncHandler(exportPortfolioDataHandler));
router.post('/', portfolioWriteLimiter, asyncHandler(postPosition));
router.patch('/:positionId', portfolioWriteLimiter, asyncHandler(patchPosition));
router.delete('/:positionId', portfolioWriteLimiter, asyncHandler(deletePosition));
router.post('/:positionId/close', portfolioWriteLimiter, asyncHandler(postClosePosition));

export default router;
