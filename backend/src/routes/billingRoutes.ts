import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { postBillingCheckout, postBillingPortal } from '../controllers/billingController.js';

const router = Router();

router.post('/checkout', authMiddleware, asyncHandler(postBillingCheckout));
router.post('/portal', authMiddleware, asyncHandler(postBillingPortal));

export default router;
