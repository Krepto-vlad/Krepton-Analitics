import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFxRateHandler, getFxRatesRangeHandler } from '../controllers/fxController.js';

const router = Router();

router.get('/rate', asyncHandler(getFxRateHandler));
router.get('/rates', asyncHandler(getFxRatesRangeHandler));

export default router;
