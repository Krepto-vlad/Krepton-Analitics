import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk';
import { env, isSnaptradeConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { SNAPTRADE_NOT_CONFIGURED_MESSAGE, SNAPTRADE_UNAVAILABLE_MESSAGE } from '../constants.js';
import { logger } from '../utils/logger.js';

export type SnaptradeSdk = InstanceType<typeof Snaptrade>;

let snaptradeClient: SnaptradeSdk | null = null;

export function getSnaptradeClient(): SnaptradeSdk | null {
  if (!isSnaptradeConfigured) {
    return null;
  }

  if (!snaptradeClient) {
    snaptradeClient = new Snaptrade({
      auth: SnaptradeAuth.commercialApiKey({
        clientId: env.snaptradeClientId,
        consumerKey: env.snaptradeConsumerKey,
      }),
    });
  }

  return snaptradeClient;
}

export function requireSnaptradeClient(): SnaptradeSdk {
  const client = getSnaptradeClient();
  if (!client) {
    throw new AppError(503, SNAPTRADE_NOT_CONFIGURED_MESSAGE);
  }

  return client;
}

export function rethrowSnaptradeFailure(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  logger.warn({ err: error }, 'SnapTrade request failed');
  throw new AppError(502, SNAPTRADE_UNAVAILABLE_MESSAGE);
}
