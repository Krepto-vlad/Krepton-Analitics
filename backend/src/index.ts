import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import stockRoutes from './routes/stockRoutes.js';
import { API_ROUTES } from './constants.js';

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

server.listen(env.port, () => {
  console.log(`[Server] HTTP on http://localhost:${env.port}`);
  console.log(`[Server] Frontend: ${env.frontendUrl}`);
});

export { app, server };
