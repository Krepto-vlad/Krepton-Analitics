import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import fxRoutes from './routes/fxRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import { API_ROUTES, HEALTH_CHECK_PATH } from './constants.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
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
  app.use(errorHandler);

  return app;
}
