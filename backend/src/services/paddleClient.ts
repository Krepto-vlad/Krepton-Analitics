import { Environment, Paddle } from '@paddle/paddle-node-sdk';
import { env, isPaddleBillingConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { BILLING_NOT_CONFIGURED_MESSAGE } from '../constants.js';

let paddleClient: Paddle | null = null;

export function getPaddleClient(): Paddle | null {
  if (!isPaddleBillingConfigured) {
    return null;
  }

  if (!paddleClient) {
    paddleClient = new Paddle(env.paddleApiKey, {
      environment:
        env.paddleEnv === Environment.production ? Environment.production : Environment.sandbox,
    });
  }

  return paddleClient;
}

export function requirePaddleClient(): Paddle {
  const paddle = getPaddleClient();
  if (!paddle) {
    throw new AppError(503, BILLING_NOT_CONFIGURED_MESSAGE);
  }

  return paddle;
}

export function getPaddlePriceIdForInterval(interval: 'month' | 'year'): string {
  return interval === 'year' ? env.paddlePlusAnnualPriceId : env.paddlePlusMonthlyPriceId;
}
