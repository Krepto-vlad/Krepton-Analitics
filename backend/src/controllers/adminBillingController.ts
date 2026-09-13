import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { findUserByEmail } from '../repositories/userRepository.js';
import { upsertAdminEntitlement } from '../repositories/billingRepository.js';
import { getSubscriptionSummaryForUser } from '../services/entitlementService.js';
import type { AdminEntitlementGrant } from '../types/billing.types.js';

function parseExpiresAt(value: unknown): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, 'expiresAt must be an ISO timestamp');
  }

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new AppError(400, 'expiresAt must be an ISO timestamp');
  }

  if (expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, 'expiresAt must be in the future');
  }

  return expiresAt;
}

function parseEmail(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, 'email is required');
  }

  return value.trim().toLowerCase();
}

export async function postAdminEntitlement(
  req: Request,
  res: Response<{ success: true; data: AdminEntitlementGrant }>
): Promise<void> {
  const email = parseEmail(req.body?.email);
  const expiresAt = parseExpiresAt(req.body?.expiresAt);
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  await upsertAdminEntitlement(user.id, expiresAt);
  const subscription = await getSubscriptionSummaryForUser(user.id);

  res.json({
    success: true,
    data: {
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      isPaid: subscription.isPaid,
    },
  });
}

export async function getAdminEntitlement(
  req: Request,
  res: Response<{ success: true; data: AdminEntitlementGrant }>
): Promise<void> {
  const email = parseEmail(req.query.email);
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const subscription = await getSubscriptionSummaryForUser(user.id);
  res.json({
    success: true,
    data: {
      email: user.email,
      expiresAt: subscription.currentPeriodEnd ?? '',
      isPaid: subscription.isPaid,
    },
  });
}
