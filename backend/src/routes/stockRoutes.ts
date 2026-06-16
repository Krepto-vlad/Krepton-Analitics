import { Router } from 'express';
import { getQuote, getHistory, searchTickers } from '../controllers/stockController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/search', asyncHandler(searchTickers));
router.get('/quote/:ticker', asyncHandler(getQuote));
router.get('/history/:ticker', asyncHandler(getHistory));

export default router;
