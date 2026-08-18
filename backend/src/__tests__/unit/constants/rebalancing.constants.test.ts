import {
  inferRebalancingAssetClassFromTicker,
  getStrategyBucketById,
  resolveEffectiveStrategyDefinition,
  REBALANCING_CUSTOM_STRATEGY_NAME,
  REBALANCING_DEFAULT_STRATEGY_ID,
  REBALANCING_PREBUILT_STRATEGIES,
} from '../../../constants/rebalancing.constants.js';

const UNKNOWN_BUCKET_ID = 'unknown-bucket';

describe('getStrategyBucketById', () => {
  const defaultStrategy = REBALANCING_PREBUILT_STRATEGIES.find(
    (strategy) => strategy.id === REBALANCING_DEFAULT_STRATEGY_ID
  );

  it('returns a bucket from a prebuilt strategy', () => {
    if (!defaultStrategy) {
      throw new Error('Default prebuilt strategy is missing');
    }

    const firstBucket = defaultStrategy.buckets[0];
    const bucket = getStrategyBucketById(REBALANCING_DEFAULT_STRATEGY_ID, firstBucket.id);

    expect(bucket?.id).toBe(firstBucket.id);
    expect(bucket?.targetPercent).toBe(firstBucket.targetPercent);
  });

  it('returns undefined for an unknown bucket', () => {
    expect(
      getStrategyBucketById(REBALANCING_DEFAULT_STRATEGY_ID, UNKNOWN_BUCKET_ID)
    ).toBeUndefined();
  });
});

describe('resolveEffectiveStrategyDefinition', () => {
  it('builds a custom strategy from the saved base', () => {
    const definition = resolveEffectiveStrategyDefinition({
      strategyId: 'custom',
      customBaseStrategyId: REBALANCING_DEFAULT_STRATEGY_ID,
    });

    expect(definition.id).toBe('custom');
    expect(definition.name).toBe(REBALANCING_CUSTOM_STRATEGY_NAME);
    expect(definition.buckets.length).toBeGreaterThan(0);
  });

  it('uses the default prebuilt strategy when custom has no base', () => {
    const definition = resolveEffectiveStrategyDefinition({
      strategyId: 'custom',
      customBaseStrategyId: null,
    });

    expect(definition.id).toBe('custom');
    expect(definition.name).toBe(REBALANCING_CUSTOM_STRATEGY_NAME);
  });
});

describe('inferRebalancingAssetClassFromTicker', () => {
  it('classifies gold futures and tokenized gold as gold', () => {
    expect(inferRebalancingAssetClassFromTicker('GC=F')).toBe('gold');
    expect(inferRebalancingAssetClassFromTicker('XAUT-USD')).toBe('gold');
    expect(inferRebalancingAssetClassFromTicker('PAXG')).toBe('gold');
  });

  it('classifies silver futures and tokenized silver as commodities', () => {
    expect(inferRebalancingAssetClassFromTicker('SI=F')).toBe('commodities');
    expect(inferRebalancingAssetClassFromTicker('XAGX-USD')).toBe('commodities');
  });

  it('returns null for regular equities', () => {
    expect(inferRebalancingAssetClassFromTicker('MSFT')).toBeNull();
  });
});
