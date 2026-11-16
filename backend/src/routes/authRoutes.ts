import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  logout,
  getMe,
  updateAiPersonalData,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  extendSession,
} from '../controllers/authController.js';
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
router.post('/google', authLimiter, asyncHandler(googleLogin));
router.post('/verify-email', authLimiter, asyncHandler(verifyEmail));
router.post('/resend-verification', authLimiter, asyncHandler(resendVerification));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(resetPassword));
router.post('/logout', logout);
router.get('/me', authMiddleware, asyncHandler(getMe));
router.patch('/ai-personal-data', authMiddleware, asyncHandler(updateAiPersonalData));
router.post('/extend', authMiddleware, asyncHandler(extendSession));
router.put('/password', authMiddleware, authLimiter, asyncHandler(changePassword));
router.delete('/account', authMiddleware, authLimiter, asyncHandler(deleteAccount));

export default router;
