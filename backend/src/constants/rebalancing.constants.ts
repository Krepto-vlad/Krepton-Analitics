export const REBALANCING_ASSET_CLASSES = [
  'equities',
  'lt_bonds',
  'it_bonds',
  'gold',
  'commodities',
  'cash',
  'sp500',
  'us_total',
  'intl_stock',
  'core_bond',
  'tbill',
  'other',
] as const;

export type RebalancingAssetClass = (typeof REBALANCING_ASSET_CLASSES)[number];

/** User-facing labels for ticker badges and mapping tables. Match sleeve wording where possible. */
export const REBALANCING_ASSET_CLASS_LABELS: Record<RebalancingAssetClass, string> = {
  equities: 'Equities',
  sp500: 'S&P 500',
  us_total: 'US Total Stock Market',
  intl_stock: 'Total International Stocks',
  lt_bonds: 'Long-Term Bonds',
  it_bonds: 'Intermediate Bonds',
  core_bond: 'US Aggregate Bonds',
  gold: 'Gold',
  commodities: 'Commodities',
  cash: 'Short-term Treasuries / cash-like',
  tbill: 'Treasury Bills',
  other: 'Other',
};

/** Equity subclasses also show a parent Equities badge on the ticker page. */
export const REBALANCING_EQUITY_SUBCLASS_ASSET_CLASSES = [
  'sp500',
  'us_total',
  'intl_stock',
] as const;

export type RebalancingEquitySubclassAssetClass =
  (typeof REBALANCING_EQUITY_SUBCLASS_ASSET_CLASSES)[number];

export const REBALANCING_ASSET_CLASS_BADGE_COLORS: Record<RebalancingAssetClass, string> = {
  equities: '#0f766e',
  sp500: '#0d9488',
  us_total: '#14b8a6',
  intl_stock: '#0284c7',
  lt_bonds: '#6366f1',
  it_bonds: '#3b82f6',
  core_bond: '#4f46e5',
  gold: '#d97706',
  commodities: '#c2410c',
  cash: '#64748b',
  tbill: '#94a3b8',
  other: '#64748b',
};

export const REBALANCING_STRATEGY_IDS = [
  'warren-buffett-9010',
  'ray-dalio-all-weather',
  'bogleheads-three-fund',
  'harry-browne-permanent',
  'custom',
] as const;

export type RebalancingStrategyId = (typeof REBALANCING_STRATEGY_IDS)[number];

export const REBALANCING_PREBUILT_STRATEGY_IDS = [
  'warren-buffett-9010',
  'ray-dalio-all-weather',
  'bogleheads-three-fund',
  'harry-browne-permanent',
] as const;

export type RebalancingPrebuiltStrategyId = (typeof REBALANCING_PREBUILT_STRATEGY_IDS)[number];

export const REBALANCING_CUSTOM_STRATEGY_NAME = 'My Custom Strategy';
export const REBALANCING_DEFAULT_STRATEGY_ID: RebalancingPrebuiltStrategyId =
  'ray-dalio-all-weather';
export const REBALANCING_ALLOCATION_TOTAL_PERCENT = 100;
export const REBALANCING_ALLOCATION_TOLERANCE = 0.01;
export const REBALANCING_DEVIATION_OPTIMAL_THRESHOLD = 2;

export interface RebalancingBucketMapping {
  tickers?: readonly string[];
  assetClasses?: readonly RebalancingAssetClass[];
  excludeTickers?: readonly string[];
}

export interface RebalancingStrategyBucketDefinition {
  id: string;
  label: string;
  targetPercent: number;
  color: string;
  mapping: RebalancingBucketMapping;
}

export interface RebalancingStrategyDefinition {
  id: RebalancingStrategyId;
  name: string;
  description: string;
  philosophy: string;
  investmentHorizon: string;
  buckets: RebalancingStrategyBucketDefinition[];
}

/** Permanent-portfolio cash sleeve. Other models do not use this id. */
export const REBALANCING_PERMANENT_CASH_BUCKET_ID = 'cash';

export const REBALANCING_PREBUILT_STRATEGIES: RebalancingStrategyDefinition[] = [
  {
    id: 'warren-buffett-9010',
    name: 'Warren Buffett 90/10',
    description: 'A low-cost S&P 500 index fund with a short-term government bond reserve.',
    philosophy: 'Buy wonderful businesses at fair prices and hold for decades.',
    investmentHorizon: 'Decades',
    buckets: [
      {
        id: 'large-cap-equities',
        label: 'S&P 500',
        targetPercent: 90,
        color: '#10b981',
        mapping: { assetClasses: ['sp500'] },
      },
      {
        id: 'short-term-treasuries',
        label: 'Short-Term Treasuries',
        targetPercent: 10,
        color: '#6366f1',
        mapping: { assetClasses: ['cash', 'tbill'] },
      },
    ],
  },
  {
    id: 'ray-dalio-all-weather',
    name: 'Ray Dalio All-Weather (30/40/15/7.5/7.5)',
    description: 'Balanced macro mix designed to perform across inflation, deflation, and crises.',
    philosophy: 'Balance risk across economic regimes instead of forecasting them.',
    investmentHorizon: '5–7 years',
    buckets: [
      {
        id: 'large-cap-stocks',
        label: 'Large-Cap Stocks',
        targetPercent: 30,
        color: '#10b981',
        mapping: { assetClasses: ['equities', 'sp500', 'us_total', 'intl_stock'] },
      },
      {
        id: 'long-term-bonds',
        label: 'Long-Term Bonds',
        targetPercent: 40,
        color: '#6366f1',
        mapping: { assetClasses: ['lt_bonds'] },
      },
      {
        id: 'intermediate-bonds',
        label: 'Intermediate Bonds',
        targetPercent: 15,
        color: '#3b82f6',
        mapping: { assetClasses: ['it_bonds'] },
      },
      {
        id: 'gold',
        label: 'Gold',
        targetPercent: 7.5,
        color: '#f59e0b',
        mapping: { assetClasses: ['gold'] },
      },
      {
        id: 'commodities',
        label: 'Commodities',
        targetPercent: 7.5,
        color: '#f97316',
        mapping: { assetClasses: ['commodities'] },
      },
    ],
  },
  {
    id: 'bogleheads-three-fund',
    name: 'Bogleheads Three-Fund',
    description:
      'A total US stock-market fund, a total international stock fund, and a US total bond-market fund.',
    philosophy: 'Minimize cost, stay diversified, and let compounding work over long horizons.',
    investmentHorizon: '10+ years',
    buckets: [
      {
        id: 'us-world-stocks',
        label: 'US Total Stock Market',
        targetPercent: 60,
        color: '#10b981',
        mapping: { assetClasses: ['us_total'] },
      },
      {
        id: 'emerging-markets',
        label: 'Total International Stocks',
        targetPercent: 20,
        color: '#14b8a6',
        mapping: { assetClasses: ['intl_stock'] },
      },
      {
        id: 'investment-grade-bonds',
        label: 'US Total Bond Market',
        targetPercent: 20,
        color: '#6366f1',
        mapping: { assetClasses: ['core_bond'] },
      },
    ],
  },
  {
    id: 'harry-browne-permanent',
    name: 'Harry Browne Permanent Portfolio',
    description: 'Equal defensive sleeves for prosperity, deflation, inflation, and recession.',
    philosophy: 'Protect purchasing power by balancing four economic scenarios in equal parts.',
    investmentHorizon: 'Any horizon',
    buckets: [
      {
        id: 'stocks',
        label: 'Stocks',
        targetPercent: 25,
        color: '#10b981',
        mapping: { assetClasses: ['equities', 'sp500', 'us_total', 'intl_stock'] },
      },
      {
        id: 'long-bonds',
        label: 'Long-Term Bonds',
        targetPercent: 25,
        color: '#6366f1',
        mapping: { assetClasses: ['lt_bonds'] },
      },
      {
        id: 'gold',
        label: 'Gold',
        targetPercent: 25,
        color: '#f59e0b',
        mapping: { assetClasses: ['gold'] },
      },
      {
        id: REBALANCING_PERMANENT_CASH_BUCKET_ID,
        label: 'Cash / T-Bills',
        targetPercent: 25,
        color: '#94a3b8',
        mapping: { assetClasses: ['tbill'] },
      },
    ],
  },
];

/** Morningstar categories Yahoo returns on fundProfile.categoryName. */
export const REBALANCING_FUND_CATEGORY_LONG_GOVERNMENT = 'long government';
export const REBALANCING_FUND_CATEGORY_INTERMEDIATE_GOVERNMENT = 'intermediate government';
export const REBALANCING_FUND_CATEGORY_SHORT_GOVERNMENT = 'short government';
export const REBALANCING_FUND_CATEGORY_ULTRASHORT_BOND = 'ultrashort bond';
export const REBALANCING_FUND_CATEGORY_INTERMEDIATE_CORE_BOND = 'intermediate core bond';
export const REBALANCING_FUND_CATEGORY_COMMODITIES_BROAD_BASKET = 'commodities broad basket';
export const REBALANCING_FUND_CATEGORY_COMMODITIES_FOCUSED = 'commodities focused';
export const REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER = 'money market';

/** A fund with at least this share of stocks is a stock fund even before the category name is read. */
export const REBALANCING_FUND_EQUITY_MIN_STOCK_POSITION = 0.5;

/** Yahoo calls both 20+ year and 7-10 year treasury funds "Long Government". The name carries the tenor. */
export const REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN = /7\s*-\s*10|7\s+TO\s+10/;
export const REBALANCING_FUND_NAME_TEN_TO_TWENTY_YEAR_PATTERN = /10\s*-\s*20/;
export const REBALANCING_FUND_NAME_SHORT_TREASURY_PATTERN = /3\s*-\s*7|1\s*-\s*3|1\s*-\s*5/;
export const REBALANCING_FUND_NAME_INTERMEDIATE_TREASURY_PATTERN = /INTERMEDIATE/;
export const REBALANCING_FUND_NAME_PHYSICAL_GOLD_PATTERN = /\bGOLD\b/;
export const REBALANCING_FUND_NAME_GOLD_MINER_PATTERN = /MINER/;
/** Vanguard and Fidelity name the S&P 500 fund "500 Index". Leveraged and inverse products stay out. */
export const REBALANCING_FUND_NAME_SP500_PATTERN = /\bS&P\s*500\b|\b500 INDEX\b/;
/** Total international, including the wiki's All-World ex-US pair. Emerging-only and small-cap completion funds stay out. */
export const REBALANCING_FUND_NAME_TOTAL_INTERNATIONAL_PATTERN =
  /\bTOTAL INTERNATIONAL\b|\bALL-WORLD EX-?US\b|\bALL WORLD EX-?US\b/;
export const REBALANCING_FUND_NAME_EMERGING_MARKET_PATTERN = /\bEMERGING\b/;
export const REBALANCING_FUND_NAME_SMALL_CAP_PATTERN = /\bSMALL[ -]?CAP\b/;
/** Whole US market. "Total Market Index" covers Fidelity's name. International and world funds are excluded separately. */
export const REBALANCING_FUND_NAME_US_TOTAL_MARKET_PATTERN =
  /\bTOTAL STOCK MARKET\b|\bTOTAL U\.?S\.? STOCK MARKET\b|\bU\.?S\.? BROAD MARKET\b|\bS&P\s*1500\b|\bTOTAL MARKET INDEX\b/;
export const REBALANCING_FUND_NAME_NOT_US_TOTAL_PATTERN =
  /\bINTERNATIONAL\b|\bEMERGING\b|\bEX-?US\b|\bWORLD\b|\bFOREIGN\b/;
/** T-bills and Treasury money-market funds. Applied only to ultrashort and money-market funds. */
export const REBALANCING_FUND_NAME_TREASURY_BILL_PATTERN =
  /\bT-?BILLS?\b|\bTREASURY\b|\b0\s*-\s*3\s*MONTHS?\b|\b1\s*-\s*3\s*MONTHS?\b/;
export const REBALANCING_FUND_NAME_LEVERAGED_OR_INVERSE_PATTERN =
  /ULTRA|LEVERAGED|INVERSE|\bBEAR\b|\bSHORT\b|[23]X/;
export const REBALANCING_FUND_LEVERAGED_CATEGORY_PATTERN = /leverag|inverse|trading/;

/** Categories that are not the All-Weather stock sleeve. Matched after the specific cases above. */
export const REBALANCING_FUND_NON_EQUITY_CATEGORY_PATTERN =
  /bond|inflation-protected|municipal|bank loan|preferred stock|commodit/;

export const REBALANCING_EQUITY_QUOTE_TYPE = 'EQUITY';
export const REBALANCING_MONEY_MARKET_QUOTE_TYPE = 'MONEYMARKET';
export const REBALANCING_FUND_QUOTE_TYPES = ['ETF', 'MUTUALFUND'] as const;

export function getPrebuiltStrategyDefinitionById(
  strategyId: RebalancingPrebuiltStrategyId
): RebalancingStrategyDefinition {
  const strategy = REBALANCING_PREBUILT_STRATEGIES.find((item) => item.id === strategyId);
  if (!strategy) {
    throw new Error(`Unknown rebalancing strategy: ${strategyId}`);
  }
  return strategy;
}

export function isPrebuiltStrategyId(
  strategyId: string
): strategyId is RebalancingPrebuiltStrategyId {
  return REBALANCING_PREBUILT_STRATEGY_IDS.includes(strategyId as RebalancingPrebuiltStrategyId);
}

export function resolveEffectiveStrategyDefinition(savedStrategy: {
  strategyId: RebalancingStrategyId;
  customBaseStrategyId: RebalancingPrebuiltStrategyId | null;
}): RebalancingStrategyDefinition {
  if (savedStrategy.strategyId === 'custom') {
    const baseStrategyId = savedStrategy.customBaseStrategyId ?? REBALANCING_DEFAULT_STRATEGY_ID;
    const baseStrategy = getPrebuiltStrategyDefinitionById(baseStrategyId);

    return {
      ...baseStrategy,
      id: 'custom',
      name: REBALANCING_CUSTOM_STRATEGY_NAME,
      description: `Custom allocation based on ${baseStrategy.name}.`,
      philosophy: baseStrategy.philosophy,
      investmentHorizon: 'User-defined',
    };
  }

  if (!isPrebuiltStrategyId(savedStrategy.strategyId)) {
    throw new Error(`Unknown rebalancing strategy: ${savedStrategy.strategyId}`);
  }

  return getPrebuiltStrategyDefinitionById(savedStrategy.strategyId);
}

export function getStrategyBucketById(
  strategyId: RebalancingPrebuiltStrategyId,
  bucketId: string
): RebalancingStrategyBucketDefinition | undefined {
  return getPrebuiltStrategyDefinitionById(strategyId).buckets.find(
    (bucket) => bucket.id === bucketId
  );
}
