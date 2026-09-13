import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { billingCustomers, billingEntitlements, billingWebhookEvents } from '../db/schema.js';
import type { BillingCustomerRow, BillingEntitlementRow } from '../types/billing.types.js';

function toEntitlementRow(row: typeof billingEntitlements.$inferSelect): BillingEntitlementRow {
  return row;
}

function toCustomerRow(row: typeof billingCustomers.$inferSelect): BillingCustomerRow {
  return row;
}

export async function findBillingEntitlementByUserId(
  userId: string
): Promise<BillingEntitlementRow | null> {
  const rows = await db
    .select()
    .from(billingEntitlements)
    .where(eq(billingEntitlements.user_id, userId))
    .limit(1);
  return rows[0] ? toEntitlementRow(rows[0]) : null;
}

export async function findBillingCustomerByUserId(
  userId: string
): Promise<BillingCustomerRow | null> {
  const rows = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.user_id, userId))
    .limit(1);
  return rows[0] ? toCustomerRow(rows[0]) : null;
}

export async function findBillingCustomerByPaddleCustomerId(
  paddleCustomerId: string
): Promise<BillingCustomerRow | null> {
  const rows = await db
    .select()
    .from(billingCustomers)
    .where(eq(billingCustomers.paddle_customer_id, paddleCustomerId))
    .limit(1);
  return rows[0] ? toCustomerRow(rows[0]) : null;
}

export async function upsertBillingCustomer(
  userId: string,
  paddleCustomerId: string
): Promise<BillingCustomerRow> {
  const rows = await db
    .insert(billingCustomers)
    .values({
      user_id: userId,
      paddle_customer_id: paddleCustomerId,
    })
    .onConflictDoUpdate({
      target: billingCustomers.user_id,
      set: { paddle_customer_id: paddleCustomerId },
    })
    .returning();
  return toCustomerRow(rows[0]);
}

export async function upsertPaddleEntitlement(params: {
  userId: string;
  paddleSubscriptionId: string;
  paddleStatus: string;
  paddleInterval: string | null;
  paddlePeriodStart: Date | null;
  paddlePeriodEnd: Date | null;
  paddleCancelAtPeriodEnd: boolean;
}): Promise<BillingEntitlementRow> {
  const rows = await db
    .insert(billingEntitlements)
    .values({
      user_id: params.userId,
      paddle_subscription_id: params.paddleSubscriptionId,
      paddle_status: params.paddleStatus,
      paddle_interval: params.paddleInterval,
      paddle_period_start: params.paddlePeriodStart,
      paddle_period_end: params.paddlePeriodEnd,
      paddle_cancel_at_period_end: params.paddleCancelAtPeriodEnd,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: billingEntitlements.user_id,
      set: {
        paddle_subscription_id: params.paddleSubscriptionId,
        paddle_status: params.paddleStatus,
        paddle_interval: params.paddleInterval,
        paddle_period_start: params.paddlePeriodStart,
        paddle_period_end: params.paddlePeriodEnd,
        paddle_cancel_at_period_end: params.paddleCancelAtPeriodEnd,
        updated_at: new Date(),
      },
    })
    .returning();
  return toEntitlementRow(rows[0]);
}

export async function upsertAdminEntitlement(
  userId: string,
  adminExpiresAt: Date
): Promise<BillingEntitlementRow> {
  const rows = await db
    .insert(billingEntitlements)
    .values({
      user_id: userId,
      admin_expires_at: adminExpiresAt,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: billingEntitlements.user_id,
      set: {
        admin_expires_at: adminExpiresAt,
        updated_at: new Date(),
      },
    })
    .returning();
  return toEntitlementRow(rows[0]);
}

export async function insertBillingWebhookEventIfNew(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const rows = await db
    .insert(billingWebhookEvents)
    .values({
      event_id: eventId,
      event_type: eventType,
    })
    .onConflictDoNothing()
    .returning();
  return rows.length > 0;
}
