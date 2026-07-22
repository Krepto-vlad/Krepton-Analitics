export const REBALANCING_ASSET_CLASSES = [
  'equities',
  'lt_bonds',
  'it_bonds',
  'gold',
  'commodities',
  'cash',
] as const;

export type RebalancingAssetClass = (typeof REBALANCING_ASSET_CLASSES)[number];

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

const EMERGING_MARKET_TICKERS = ['VWO', 'IEMG', 'EEM', 'SCHE', 'VXEM'] as const;
const US_WORLD_INDEX_TICKERS = ['VTI', 'VOO', 'SPY', 'IVV', 'VT', 'VXUS', 'ACWI'] as const;
const SHORT_TERM_TREASURY_TICKERS = ['SHY', 'BIL', 'SHV', 'VGSH', 'SPTS'] as const;
const CASH_TICKERS = ['BIL', 'SHV', 'SGOV', 'VMFXX', 'SPRXX'] as const;
const BOND_INDEX_TICKERS = ['BND', 'AGG', 'VBTLX', 'IEF', 'VGIT', 'TLT', 'VGLT', 'EDV'] as const;

export const REBALANCING_PREBUILT_STRATEGIES: RebalancingStrategyDefinition[] = [
  {
    id: 'warren-buffett-9010',
    name: 'Warren Buffett 90/10',
    description: 'Large-cap equities with a short-term treasury sleeve for crisis liquidity.',
    philosophy: 'Buy wonderful businesses at fair prices and hold for decades.',
    investmentHorizon: 'Decades',
    buckets: [
      {
        id: 'large-cap-equities',
        label: 'Large-Cap Equities',
        targetPercent: 90,
        color: '#10b981',
        mapping: {
          assetClasses: ['equities'],
          excludeTickers: [...SHORT_TERM_TREASURY_TICKERS, ...CASH_TICKERS, ...BOND_INDEX_TICKERS],
        },
      },
      {
        id: 'short-term-treasuries',
        label: 'Short-Term Treasuries',
        targetPercent: 10,
        color: '#6366f1',
        mapping: {
          tickers: SHORT_TERM_TREASURY_TICKERS,
          assetClasses: ['it_bonds', 'cash'],
        },
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
        mapping: { assetClasses: ['equities'] },
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
    description: 'Simple passive portfolio built from broad index funds and high-quality bonds.',
    philosophy: 'Minimize cost, stay diversified, and let compounding work over long horizons.',
    investmentHorizon: '10+ years',
    buckets: [
      {
        id: 'us-world-stocks',
        label: 'US / World Stock Index',
        targetPercent: 60,
        color: '#10b981',
        mapping: {
          tickers: US_WORLD_INDEX_TICKERS,
          assetClasses: ['equities'],
          excludeTickers: EMERGING_MARKET_TICKERS,
        },
      },
      {
        id: 'emerging-markets',
        label: 'Emerging Markets',
        targetPercent: 20,
        color: '#14b8a6',
        mapping: {
          tickers: EMERGING_MARKET_TICKERS,
        },
      },
      {
        id: 'investment-grade-bonds',
        label: 'Investment-Grade Bonds',
        targetPercent: 20,
        color: '#6366f1',
        mapping: {
          tickers: BOND_INDEX_TICKERS,
          assetClasses: ['lt_bonds', 'it_bonds'],
        },
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
        mapping: { assetClasses: ['equities'] },
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
        id: 'cash',
        label: 'Cash / T-Bills',
        targetPercent: 25,
        color: '#94a3b8',
        mapping: {
          tickers: CASH_TICKERS,
          assetClasses: ['cash'],
        },
      },
    ],
  },
];

export const REBALANCING_TICKER_ASSET_CLASS: Readonly<Record<string, RebalancingAssetClass>> = {
  SPY: 'equities',
  QQQ: 'equities',
  VTI: 'equities',
  VOO: 'equities',
  IVV: 'equities',
  IWM: 'equities',
  DIA: 'equities',
  VWO: 'equities',
  IEMG: 'equities',
  EEM: 'equities',
  GLD: 'gold',
  IAU: 'gold',
  SGOL: 'gold',
  BAR: 'gold',
  OUNZ: 'gold',
  TLT: 'lt_bonds',
  VGLT: 'lt_bonds',
  EDV: 'lt_bonds',
  IEF: 'it_bonds',
  VGIT: 'it_bonds',
  IEI: 'it_bonds',
  SHY: 'it_bonds',
  BND: 'lt_bonds',
  AGG: 'lt_bonds',
  DBC: 'commodities',
  GSG: 'commodities',
  PDBC: 'commodities',
  USO: 'commodities',
  UNG: 'commodities',
  BIL: 'cash',
  SHV: 'cash',
  SGOV: 'cash',
  'GC=F': 'gold',
  'MGC=F': 'gold',
  'QO=F': 'gold',
  'SI=F': 'commodities',
  'CL=F': 'commodities',
  'XAUT-USD': 'gold',
  'PAXG-USD': 'gold',
  PAXG: 'gold',
  XAUT: 'gold',
  'XAGX-USD': 'commodities',
  'XAG-USD': 'commodities',
  SLV: 'commodities',
  SIVR: 'commodities',
};

const REBALANCING_GOLD_TICKER_PATTERNS: readonly RegExp[] = [
  /^GC=F$/,
  /^MGC=F$/,
  /^QO=F$/,
  /^XAUT(-USD)?$/,
  /^PAXG(-USD)?$/,
];

const REBALANCING_SILVER_TICKER_PATTERNS: readonly RegExp[] = [
  /^SI=F$/,
  /^XAGX(-USD)?$/,
  /^XAG(-USD)?$/,
];

export function inferRebalancingAssetClassFromTicker(ticker: string): RebalancingAssetClass | null {
  const upperTicker = ticker.toUpperCase();

  if (REBALANCING_GOLD_TICKER_PATTERNS.some((pattern) => pattern.test(upperTicker))) {
    return 'gold';
  }

  if (REBALANCING_SILVER_TICKER_PATTERNS.some((pattern) => pattern.test(upperTicker))) {
    return 'commodities';
  }

  return null;
}

export const REBALANCING_GOLD_TICKERS: readonly string[] = [
  'NEM',
  'GOLD',
  'AEM',
  'FNV',
  'WPM',
  'RGLD',
  'KGC',
  'GFI',
];

export const REBALANCING_SECTOR_ASSET_CLASS: Readonly<Record<string, RebalancingAssetClass>> = {
  Energy: 'commodities',
  'Basic Materials': 'commodities',
  'Consumer Cyclical': 'equities',
  'Consumer Defensive': 'equities',
  'Financial Services': 'equities',
  Financials: 'equities',
  Healthcare: 'equities',
  'Health Care': 'equities',
  Industrials: 'equities',
  'Real Estate': 'equities',
  Technology: 'equities',
  'Information Technology': 'equities',
  'Communication Services': 'equities',
  'Telecommunication Services': 'equities',
  Utilities: 'equities',
};

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
