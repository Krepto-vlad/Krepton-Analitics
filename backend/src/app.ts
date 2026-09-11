import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import fxRoutes from './routes/fxRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import { postPaddleWebhook } from './controllers/billingController.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { API_ROUTES, HEALTH_CHECK_PATH } from './constants.js';

export function createApp(): Express {
  const app = express();

  // JSON-only API — no HTML is served, so the default CSP/COEP/CORP policies are safe as-is.
  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.post(
    `${API_ROUTES.BILLING}/webhook`,
    express.raw({ type: 'application/json' }),
    asyncHandler(postPaddleWebhook)
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(requestLogger);

  app.get(HEALTH_CHECK_PATH, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(API_ROUTES.DOCS, docsRoutes);
  app.use(API_ROUTES.STOCKS, stockRoutes);
  app.use(API_ROUTES.AUTH, authRoutes);
  app.use(API_ROUTES.PORTFOLIO, portfolioRoutes);
  app.use(API_ROUTES.FX, fxRoutes);
  app.use(API_ROUTES.BILLING, billingRoutes);
  app.use(API_ROUTES.ADMIN, adminRoutes);
  app.use(errorHandler);

  return app;
}
