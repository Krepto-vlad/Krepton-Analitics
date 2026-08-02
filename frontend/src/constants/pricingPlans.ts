export type PricingPlanId = 'free' | 'pro' | 'institutional';

export interface PricingPlanDefinition {
  id: PricingPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

export const PRICING_PLAN_DEFINITIONS: PricingPlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    description: 'For individual investors getting started',
    features: [
      'Up to 15 positions',
      '1 broker import/month',
      'Basic P&L tracking',
      'Dividend calendar',
      'Community support',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For active portfolio managers',
    features: [
      'Unlimited positions',
      'Unlimited broker imports',
      'Gemini AI Insights (50/mo)',
      'Advanced backtesting',
      'Stock screener',
      'Priority support',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'institutional',
    name: 'Institutional',
    price: '$49',
    period: '/month',
    description: 'For advisors managing multiple portfolios',
    features: [
      'Everything in Pro',
      'Unlimited AI requests',
      'Multi-portfolio management',
      'API access',
      'White-label reports',
      'Dedicated support',
    ],
    highlighted: false,
  },
];

export const MARKETING_PLAN_CALL_TO_ACTIONS: Record<PricingPlanId, string> = {
  free: 'Get Started Free',
  pro: 'Start Pro Trial',
  institutional: 'Contact Sales',
};

export const SUBSCRIPTION_PLAN_CALL_TO_ACTIONS: Record<PricingPlanId, string> = {
  free: 'Current plan',
  pro: 'Upgrade to Pro',
  institutional: 'Contact sales',
};

export const CURRENT_DEMO_PLAN_ID: PricingPlanId = 'free';
