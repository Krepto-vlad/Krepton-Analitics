export const SUBSCRIPTION_PLANS = ['free', 'plus'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_INTERVALS = ['month', 'year', 'comp'] as const;
export type SubscriptionInterval = (typeof SUBSCRIPTION_INTERVALS)[number];

export const SUBSCRIPTION_SOURCES = ['paddle', 'admin'] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];

export const SUBSCRIPTION_STATUSES = ['none', 'active', 'canceled', 'past_due'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionSummary {
  isPaid: boolean;
  plan: SubscriptionPlan;
  interval: SubscriptionInterval | null;
  source: SubscriptionSource | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingEntitlementRow {
  user_id: string;
  paddle_subscription_id: string | null;
  paddle_status: string | null;
  paddle_interval: string | null;
  paddle_period_start: Date | null;
  paddle_period_end: Date | null;
  paddle_cancel_at_period_end: boolean;
  admin_expires_at: Date | null;
  updated_at: Date;
}

export interface BillingCustomerRow {
  user_id: string;
  paddle_customer_id: string;
  created_at: Date;
}

export interface CreateCheckoutResult {
  transactionId: string;
}

export interface CustomerPortalResult {
  url: string;
}

export interface AdminEntitlementGrant {
  email: string;
  expiresAt: string;
  isPaid: boolean;
}

export function createFreeSubscriptionSummary(): SubscriptionSummary {
  return {
    isPaid: false,
    plan: 'free',
    interval: null,
    source: null,
    status: 'none',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}
