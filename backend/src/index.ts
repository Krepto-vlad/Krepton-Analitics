import 'dotenv/config';
import http from 'http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { LOG_EVENT } from './constants.js';
import { createApp } from './app.js';
import { initializeTickerTapeScheduler } from './services/stockService.js';
import { checkDatabaseConnection } from './config/db.js';

const app = createApp();
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
