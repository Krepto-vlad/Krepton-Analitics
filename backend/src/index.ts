import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import stockRoutes from './routes/stockRoutes.js';
import authRoutes from './routes/authRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import fxRoutes from './routes/fxRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import { API_ROUTES, HEALTH_CHECK_PATH, LOG_EVENT } from './constants.js';
import { initializeTickerTapeScheduler } from './services/stockService.js';
import { checkDatabaseConnection } from './config/db.js';

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

const server = http.createServer(app);

let tickerTapeTimer: ReturnType<typeof setInterval> | null = null;

server.listen(env.port, () => {
  logger.info(
    {
      event: LOG_EVENT.SERVER_STARTED,
      port: env.port,
      frontendUrl: env.frontendUrl,
      nodeEnv: env.nodeEnv,
    },
    'HTTP server listening'
  );

  checkDatabaseConnection().catch((err) => {
    logger.error({ event: LOG_EVENT.DB_CONNECTION_FAILED, err }, 'Database connection failed');
  });

  tickerTapeTimer = initializeTickerTapeScheduler();
});

function shutdown(signal: string): void {
  logger.info({ event: LOG_EVENT.SERVER_SHUTDOWN, signal }, 'Shutting down gracefully');

  if (tickerTapeTimer !== null) {
    clearInterval(tickerTapeTimer);
    tickerTapeTimer = null;
  }

  server.close(() => {
    logger.info({ event: LOG_EVENT.HTTP_SERVER_CLOSED }, 'HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server };
