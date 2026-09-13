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

export const FREE_SUBSCRIPTION_SUMMARY: SubscriptionSummary = {
  isPaid: false,
  plan: 'free',
  interval: null,
  source: null,
  status: 'none',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export interface BillingCheckoutResult {
  transactionId: string;
}

export interface BillingPortalResult {
  url: string;
}

export interface AdminEntitlementGrant {
  email: string;
  expiresAt: string;
  isPaid: boolean;
}
