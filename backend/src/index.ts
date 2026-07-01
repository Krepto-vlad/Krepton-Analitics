import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import stockRoutes from './routes/stockRoutes.js';
import { API_ROUTES } from './constants.js';
import { initializeTickerTapeScheduler } from './services/stockService.js';

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(API_ROUTES.STOCKS, stockRoutes);
app.use(errorHandler);

const server = http.createServer(app);

let tickerTapeTimer: ReturnType<typeof setInterval> | null = null;

server.listen(env.port, () => {
  console.log(`[Server] HTTP on http://localhost:${env.port}`);
  console.log(`[Server] Frontend: ${env.frontendUrl}`);

  // Store the timer so it can be cancelled on graceful shutdown
  tickerTapeTimer = initializeTickerTapeScheduler();
});

function shutdown(signal: string): void {
  console.log(`[Server] ${signal} received — shutting down gracefully`);

  if (tickerTapeTimer !== null) {
    clearInterval(tickerTapeTimer);
    tickerTapeTimer = null;
    console.log('[Server] Ticker tape scheduler stopped');
  }

  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server };
