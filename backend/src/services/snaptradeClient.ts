import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk';
import { env, isSnaptradeConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { SNAPTRADE_NOT_CONFIGURED_MESSAGE } from '../constants.js';

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
