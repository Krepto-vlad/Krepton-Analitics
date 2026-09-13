export type PricingPlanId = 'free' | 'plus_monthly' | 'plus_annual';
export type PaidCheckoutInterval = 'month' | 'year';

export interface PricingPlanDefinition {
  id: PricingPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  checkoutInterval: PaidCheckoutInterval | null;
}

/** Placeholder amounts until prices are confirmed. Must match Paddle catalog. */
export const PLUS_MONTHLY_DISPLAY_PRICE = '$9';
export const PLUS_ANNUAL_DISPLAY_PRICE = '$90';

export const PRICING_PLAN_DEFINITIONS: PricingPlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    description: 'Track a portfolio with daily AI limits',
    features: [
      'Positions, watchlist, and broker import',
      'Rebalancing calculator and backtesting',
      'Stock screener and dividend calendar',
      'AI briefing 5/day, alignment 5/day, ticker chat 20/day',
    ],
    highlighted: false,
    checkoutInterval: null,
  },
  {
    id: 'plus_monthly',
    name: 'Plus',
    price: PLUS_MONTHLY_DISPLAY_PRICE,
    period: '/month',
    description: 'Same workspace, higher daily AI limits',
    features: [
      'Everything in Free',
      'Higher daily AI limits (briefing 50, alignment 50, ticker chat 200)',
      'Cancel anytime; access lasts until the period end',
      'Invoices emailed by Paddle, the seller of paid plans',
    ],
    highlighted: true,
    badge: 'Most popular',
    checkoutInterval: 'month',
  },
  {
    id: 'plus_annual',
    name: 'Plus Annual',
    price: PLUS_ANNUAL_DISPLAY_PRICE,
    period: '/year',
    description: 'Plus billed yearly — about two months free vs monthly',
    features: [
      'Everything in Plus monthly',
      'Lower price per month when paid annually',
      'Same higher AI limits for the whole year',
      'VAT added at Paddle checkout where required',
    ],
    highlighted: false,
    checkoutInterval: 'year',
  },
];

export const MARKETING_PLAN_CALL_TO_ACTIONS: Record<PricingPlanId, string> = {
  free: 'Get started free',
  plus_monthly: 'Start Plus monthly',
  plus_annual: 'Start Plus annual',
};

export const SUBSCRIPTION_PLAN_CALL_TO_ACTIONS: Record<PricingPlanId, string> = {
  free: 'Current plan',
  plus_monthly: 'Upgrade monthly',
  plus_annual: 'Upgrade annual',
};

export const PRICING_VAT_FOOTNOTE =
  'Prices shown before VAT. Paddle (Merchant of Record) adds tax at checkout for your country and emails the invoice.';
