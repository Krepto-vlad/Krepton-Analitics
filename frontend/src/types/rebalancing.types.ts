export type RebalancingPrebuiltStrategyId =
  | 'warren-buffett-9010'
  | 'ray-dalio-all-weather'
  | 'bogleheads-three-fund'
  | 'harry-browne-permanent';

export type RebalancingStrategyId = RebalancingPrebuiltStrategyId | 'custom';

export interface RebalancingAllocationItem {
  bucketId: string;
  label: string;
  color: string;
  weightPercent: number;
}

export interface RebalancingDeviationItem {
  bucketId: string;
  label: string;
  color: string;
  currentPercent: number;
  targetPercent: number;
  deviationPercent: number;
  status: 'overweight' | 'underweight' | 'optimal';
}

export interface RebalancingTickerMappingItem {
  ticker: string;
  sector: string | null;
  marketValue: number;
  bucketId: string;
  bucketLabel: string;
  inferredAssetClass: string;
  mappingSource: 'ticker' | 'asset_class' | 'sector' | 'default' | 'unmapped';
}

export interface RebalancingStrategyBucketOption {
  id: string;
  label: string;
  color: string;
  targetPercent: number;
}

export interface RebalancingStrategyOption {
  id: RebalancingPrebuiltStrategyId;
  name: string;
  description: string;
  philosophy: string;
  investmentHorizon: string;
  buckets: RebalancingStrategyBucketOption[];
}

export interface SavedCustomStrategySummary {
  baseStrategyId: RebalancingPrebuiltStrategyId;
  baseStrategyName: string;
  targetAllocations: RebalancingAllocationItem[];
}

export interface RebalancingAnalysisResponse {
  strategyId: RebalancingStrategyId;
  strategyName: string;
  strategyDescription: string;
  strategyPhilosophy: string;
  investmentHorizon: string;
  customBaseStrategyId: RebalancingPrebuiltStrategyId | null;
  savedCustomStrategy: SavedCustomStrategySummary | null;
  displayCurrency: string;
  totalPortfolioValue: number;
  alignmentScore: number;
  targetAllocations: RebalancingAllocationItem[];
  currentAllocations: RebalancingAllocationItem[];
  deviations: RebalancingDeviationItem[];
  tickerMappings: RebalancingTickerMappingItem[];
}

export interface UpdateRebalancingStrategyPayload {
  strategyId: RebalancingStrategyId;
  customBaseStrategyId?: RebalancingPrebuiltStrategyId;
  customAllocations?: Record<string, number>;
}

export const REBALANCING_CUSTOM_STRATEGY_NAME = 'My Custom Strategy';
