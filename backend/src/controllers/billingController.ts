import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  createCustomerPortalSession,
  createPlusCheckout,
} from '../services/billingCheckoutService.js';
import { verifyAndProcessPaddleWebhook } from '../services/paddleWebhookService.js';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Unauthorized');
  }

  return req.userId;
}

export async function postBillingCheckout(req: Request, res: Response): Promise<void> {
  const checkout = await createPlusCheckout(requireUserId(req), req.body?.interval);
  res.json({ success: true, data: checkout });
}

export async function postBillingPortal(req: Request, res: Response): Promise<void> {
  const portal = await createCustomerPortalSession(requireUserId(req));
  res.json({ success: true, data: portal });
}

export async function postPaddleWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['paddle-signature'];
  if (typeof signature !== 'string' || signature.length === 0) {
    throw new AppError(400, 'Missing Paddle-Signature header');
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : '';

  if (rawBody.length === 0) {
    throw new AppError(400, 'Empty webhook body');
  }

  await verifyAndProcessPaddleWebhook(rawBody, signature);
  res.status(200).json({ success: true, data: { received: true } });
}
