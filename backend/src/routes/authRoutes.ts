import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import rateLimit from 'express-rate-limit';
import { AUTH_RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX_REQUESTS } from '../constants.js';

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/logout', logout);
router.get('/me', authMiddleware, asyncHandler(getMe));

export default router;
