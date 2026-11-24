import pino from 'pino';
import { isDevelopment } from '../config/env.js';
import { getRequestId } from './requestContext.js';

function isJestWorker(): boolean {
  return process.env.JEST_WORKER_ID !== undefined;
}

const LOG_LEVEL_ENV_VARIABLE = 'LOG_LEVEL';
const SILENT_LOG_LEVEL = 'silent';

function readConfiguredLogLevel(): pino.LevelWithSilent | undefined {
  const configuredLevel = process.env[LOG_LEVEL_ENV_VARIABLE];
  if (
    configuredLevel === SILENT_LOG_LEVEL ||
    (configuredLevel && configuredLevel in pino.levels.values)
  ) {
    return configuredLevel as pino.LevelWithSilent;
  }
  return undefined;
}

function resolveLogLevel(): pino.LevelWithSilent {
  if (isJestWorker()) {
    return 'silent';
  }

  const configuredLevel = readConfiguredLogLevel();
  if (configuredLevel) {
    return configuredLevel;
  }

  return isDevelopment ? 'debug' : 'info';
}

export const logger = pino({
  level: resolveLogLevel(),
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin(): { requestId?: string } {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', 'req.headers.authorization'],
    censor: '[redacted]',
  },
  ...(isDevelopment && !isJestWorker()
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});
