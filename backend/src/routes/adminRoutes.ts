import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import {
  getAdminEntitlement,
  postAdminEntitlement,
} from '../controllers/adminBillingController.js';

const router = Router();

router.use(authMiddleware);
router.use((req, res, next) => {
  void adminMiddleware(req, res, next);
});
router.get('/entitlements', asyncHandler(getAdminEntitlement));
router.post('/entitlements', asyncHandler(postAdminEntitlement));

export default router;
