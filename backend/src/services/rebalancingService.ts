import {
  REBALANCING_ALLOCATION_TOTAL_PERCENT,
  REBALANCING_ALLOCATION_TOLERANCE,
  REBALANCING_DEVIATION_OPTIMAL_THRESHOLD,
  REBALANCING_GOLD_TICKERS,
  REBALANCING_PREBUILT_STRATEGIES,
  REBALANCING_SECTOR_ASSET_CLASS,
  REBALANCING_TICKER_ASSET_CLASS,
  getPrebuiltStrategyDefinitionById,
  inferRebalancingAssetClassFromTicker,
  isPrebuiltStrategyId,
  resolveEffectiveStrategyDefinition,
  type RebalancingAssetClass,
  type RebalancingBucketMapping,
  type RebalancingPrebuiltStrategyId,
  type RebalancingStrategyBucketDefinition,
  type RebalancingStrategyDefinition,
} from '../constants/rebalancing.constants.js';
import type {
  RebalancingAllocationItem,
  RebalancingAnalysisResponse,
  RebalancingDeviationItem,
  RebalancingStrategyOption,
  RebalancingTickerMappingItem,
  SavedCustomStrategySummary,
  SavedRebalancingStrategy,
  UpdateRebalancingStrategyDto,
} from '../types/rebalancing.types.js';
import type { PositionRow } from '../types/portfolio.types.js';
import type { DisplayCurrency } from '../types/fx.types.js';
import { getCachedStockQuotes } from './quoteCacheService.js';
import {
  collectConversionRequests,
  convertAmountForDisplay,
  createFxRateLookup,
  roundMoney,
} from './currencyConversionService.js';
import { getTodayIsoDate, parseDisplayCurrency } from '../utils/displayCurrency.js';
import { AppError } from '../middleware/errorHandler.js';

interface PositionInstrumentProfile {
  ticker: string;
  sector: string | null;
  marketValue: number;
  assetClass: RebalancingAssetClass;
  assetClassSource: 'ticker' | 'sector' | 'default';
}

interface BucketAssignment {
  bucketId: string;
  bucketLabel: string;
  bucketColor: string;
  mappingSource: RebalancingTickerMappingItem['mappingSource'];
}

function resolveSavedStrategyDefinition(
  savedStrategy: SavedRebalancingStrategy
): RebalancingStrategyDefinition {
  try {
    return resolveEffectiveStrategyDefinition(savedStrategy);
  } catch {
    throw new AppError(400, `Unknown rebalancing strategy: ${savedStrategy.strategyId}`);
  }
}

function buildSavedCustomStrategySummary(
  savedStrategy: SavedRebalancingStrategy
): SavedCustomStrategySummary | null {
  if (!savedStrategy.customBaseStrategyId || !savedStrategy.customAllocations) {
    return null;
  }

  const baseStrategy = getPrebuiltStrategyDefinitionById(savedStrategy.customBaseStrategyId);
  const targetWeights = normalizeCustomAllocations(baseStrategy, savedStrategy.customAllocations);

  return {
    baseStrategyId: savedStrategy.customBaseStrategyId,
    baseStrategyName: baseStrategy.name,
    targetAllocations: baseStrategy.buckets.map((bucket) => ({
      bucketId: bucket.id,
      label: bucket.label,
      color: bucket.color,
      weightPercent: roundMoney(targetWeights[bucket.id] ?? 0),
    })),
  };
}

function normalizeCustomAllocations(
  strategy: RebalancingStrategyDefinition,
  customAllocations: Record<string, number> | null | undefined
): Record<string, number> {
  const normalized = strategy.buckets.reduce<Record<string, number>>((accumulator, bucket) => {
    accumulator[bucket.id] = 0;
    return accumulator;
  }, {});

  if (!customAllocations) {
    return normalized;
  }

  for (const bucket of strategy.buckets) {
    const rawValue = customAllocations[bucket.id];
    if (rawValue === undefined || rawValue === null) {
      continue;
    }
    normalized[bucket.id] = Math.max(0, rawValue);
  }

  return normalized;
}

function assertValidCustomAllocations(allocations: Record<string, number>): void {
  const total = Object.values(allocations).reduce((sum, value) => sum + value, 0);

  if (Math.abs(total - REBALANCING_ALLOCATION_TOTAL_PERCENT) > REBALANCING_ALLOCATION_TOLERANCE) {
    throw new AppError(400, 'Custom allocation weights must sum to 100%.');
  }
}

export function resolveTargetBucketWeights(
  savedStrategy: SavedRebalancingStrategy
): Record<string, number> {
  const strategy = resolveSavedStrategyDefinition(savedStrategy);

  if (savedStrategy.strategyId === 'custom') {
    const customAllocations = normalizeCustomAllocations(strategy, savedStrategy.customAllocations);
    assertValidCustomAllocations(customAllocations);
    return customAllocations;
  }

  return strategy.buckets.reduce<Record<string, number>>((accumulator, bucket) => {
    accumulator[bucket.id] = bucket.targetPercent;
    return accumulator;
  }, {});
}

export function validateUpdateRebalancingStrategyDto(dto: UpdateRebalancingStrategyDto): void {
  if (dto.strategyId === 'custom') {
    if (!dto.customAllocations) {
      return;
    }

    if (!dto.customBaseStrategyId || !isPrebuiltStrategyId(dto.customBaseStrategyId)) {
      throw new AppError(400, 'Custom strategy requires a valid base strategy.');
    }

    const baseStrategy = getPrebuiltStrategyDefinitionById(dto.customBaseStrategyId);
    const customAllocations = normalizeCustomAllocations(baseStrategy, dto.customAllocations);
    assertValidCustomAllocations(customAllocations);
    return;
  }

  if (!isPrebuiltStrategyId(dto.strategyId)) {
    throw new AppError(400, `Unknown rebalancing strategy: ${dto.strategyId}`);
  }
}

function classifyTickerAssetClass(
  ticker: string,
  sector: string | null
): Pick<PositionInstrumentProfile, 'assetClass' | 'assetClassSource'> {
  const upperTicker = ticker.toUpperCase();

  if (REBALANCING_TICKER_ASSET_CLASS[upperTicker]) {
    return {
      assetClass: REBALANCING_TICKER_ASSET_CLASS[upperTicker],
      assetClassSource: 'ticker',
    };
  }

  if (REBALANCING_GOLD_TICKERS.includes(upperTicker)) {
    return {
      assetClass: 'gold',
      assetClassSource: 'ticker',
    };
  }

  const inferredFromPattern = inferRebalancingAssetClassFromTicker(upperTicker);
  if (inferredFromPattern) {
    return {
      assetClass: inferredFromPattern,
      assetClassSource: 'ticker',
    };
  }

  if (sector) {
    const mappedClass = REBALANCING_SECTOR_ASSET_CLASS[sector];
    if (mappedClass) {
      return {
        assetClass: mappedClass,
        assetClassSource: 'sector',
      };
    }
  }

  return {
    assetClass: 'equities',
    assetClassSource: 'default',
  };
}

function matchesBucketMapping(
  profile: PositionInstrumentProfile,
  mapping: RebalancingBucketMapping
): { matched: boolean; source: RebalancingTickerMappingItem['mappingSource'] } {
  const upperTicker = profile.ticker.toUpperCase();

  if (mapping.excludeTickers?.includes(upperTicker)) {
    return { matched: false, source: 'unmapped' };
  }

  if (mapping.tickers?.includes(upperTicker)) {
    return { matched: true, source: 'ticker' };
  }

  if (mapping.assetClasses?.includes(profile.assetClass)) {
    return { matched: true, source: 'asset_class' };
  }

  return { matched: false, source: 'unmapped' };
}

function assignPositionToBucket(
  profile: PositionInstrumentProfile,
  buckets: RebalancingStrategyBucketDefinition[]
): BucketAssignment {
  for (const bucket of buckets) {
    const match = matchesBucketMapping(profile, bucket.mapping);
    if (match.matched) {
      return {
        bucketId: bucket.id,
        bucketLabel: bucket.label,
        bucketColor: bucket.color,
        mappingSource: match.source,
      };
    }
  }

  return {
    bucketId: 'unmapped',
    bucketLabel: 'Unmapped',
    bucketColor: '#64748b',
    mappingSource: 'unmapped',
  };
}

function buildVisibleAllocationItems(
  strategy: RebalancingStrategyDefinition,
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>
): {
  currentAllocations: RebalancingAllocationItem[];
  targetAllocations: RebalancingAllocationItem[];
} {
  const visibleBucketIds = strategy.buckets
    .map((bucket) => bucket.id)
    .filter(
      (bucketId) => (currentWeights[bucketId] ?? 0) > 0 || (targetWeights[bucketId] ?? 0) > 0
    );

  const mapItems = (weights: Record<string, number>): RebalancingAllocationItem[] =>
    visibleBucketIds.map((bucketId) => {
      const bucket = strategy.buckets.find((item) => item.id === bucketId);
      return {
        bucketId,
        label: bucket?.label ?? bucketId,
        color: bucket?.color ?? '#64748b',
        weightPercent: roundMoney(weights[bucketId] ?? 0),
      };
    });

  return {
    currentAllocations: mapItems(currentWeights),
    targetAllocations: mapItems(targetWeights),
  };
}

function buildDeviationItems(
  strategy: RebalancingStrategyDefinition,
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>
): RebalancingDeviationItem[] {
  return strategy.buckets
    .map((bucket) => {
      const currentPercent = roundMoney(currentWeights[bucket.id] ?? 0);
      const targetPercent = roundMoney(targetWeights[bucket.id] ?? 0);
      const deviationPercent = roundMoney(currentPercent - targetPercent);
      const absoluteDeviation = Math.abs(deviationPercent);

      let status: RebalancingDeviationItem['status'] = 'optimal';
      if (absoluteDeviation > REBALANCING_DEVIATION_OPTIMAL_THRESHOLD) {
        status = deviationPercent > 0 ? 'overweight' : 'underweight';
      }

      return {
        bucketId: bucket.id,
        label: bucket.label,
        color: bucket.color,
        currentPercent,
        targetPercent,
        deviationPercent,
        status,
      };
    })
    .filter((item) => item.currentPercent > 0 || item.targetPercent > 0);
}

function computeAlignmentScore(
  strategy: RebalancingStrategyDefinition,
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>
): number {
  const totalAbsoluteDeviation = strategy.buckets.reduce((sum, bucket) => {
    return sum + Math.abs((currentWeights[bucket.id] ?? 0) - (targetWeights[bucket.id] ?? 0));
  }, 0);

  const normalizedDrift = totalAbsoluteDeviation / 2;
  return Math.max(0, Math.round(100 - normalizedDrift));
}

async function buildPositionProfiles(
  rows: PositionRow[],
  displayCurrency: DisplayCurrency
): Promise<PositionInstrumentProfile[]> {
  if (rows.length === 0) {
    return [];
  }

  const tickers = rows.map((row) => row.ticker.toUpperCase());
  const quotes = await getCachedStockQuotes(tickers);
  const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker.toUpperCase(), quote]));

  const lookup = await createFxRateLookup(
    displayCurrency,
    collectConversionRequests(
      rows.map((row) => {
        const ticker = row.ticker.toUpperCase();
        const quote = quoteByTicker.get(ticker);
        return {
          currency: quote?.currency ?? row.currency,
          rateDate: getTodayIsoDate(),
        };
      })
    )
  );

  const profiles: PositionInstrumentProfile[] = [];

  for (const row of rows) {
    const ticker = row.ticker.toUpperCase();
    const shares = parseFloat(row.shares);
    const quote = quoteByTicker.get(ticker);
    const sourceCurrency = quote?.currency ?? row.currency;
    const quotePrice = quote?.price;
    const hasPositiveQuotePrice = typeof quotePrice === 'number' && quotePrice > 0;
    const nativePrice = hasPositiveQuotePrice ? quotePrice : parseFloat(row.avg_buy_price);
    const nativeMarketValue = shares * nativePrice;

    let marketValue = nativeMarketValue;
    if (sourceCurrency !== displayCurrency) {
      const converted = await convertAmountForDisplay(
        nativeMarketValue,
        sourceCurrency,
        getTodayIsoDate(),
        displayCurrency,
        lookup
      );
      marketValue = converted.displayAmount;
    }

    const classification = classifyTickerAssetClass(ticker, row.sector);

    profiles.push({
      ticker,
      sector: row.sector,
      marketValue: roundMoney(marketValue),
      assetClass: classification.assetClass,
      assetClassSource: classification.assetClassSource,
    });
  }

  return profiles;
}

function aggregateBucketWeights(
  strategy: RebalancingStrategyDefinition,
  profiles: PositionInstrumentProfile[]
): Record<string, number> {
  const totals = strategy.buckets.reduce<Record<string, number>>((accumulator, bucket) => {
    accumulator[bucket.id] = 0;
    return accumulator;
  }, {});
  totals.unmapped = 0;

  const totalValue = profiles.reduce((sum, profile) => sum + profile.marketValue, 0);
  if (totalValue <= 0) {
    return totals;
  }

  for (const profile of profiles) {
    const assignment = assignPositionToBucket(profile, strategy.buckets);
    const bucketKey = assignment.bucketId in totals ? assignment.bucketId : 'unmapped';
    totals[bucketKey] += (profile.marketValue / totalValue) * 100;
  }

  for (const bucketId of Object.keys(totals)) {
    totals[bucketId] = roundMoney(totals[bucketId]);
  }

  return totals;
}

export async function buildRebalancingAnalysis(
  rows: PositionRow[],
  savedStrategy: SavedRebalancingStrategy,
  rawDisplayCurrency?: unknown
): Promise<RebalancingAnalysisResponse> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const strategy = resolveSavedStrategyDefinition(savedStrategy);
  const targetWeights = resolveTargetBucketWeights(savedStrategy);
  const profiles = await buildPositionProfiles(rows, displayCurrency);
  const currentWeights = aggregateBucketWeights(strategy, profiles);
  const totalPortfolioValue = roundMoney(
    profiles.reduce((sum, profile) => sum + profile.marketValue, 0)
  );
  const customBaseStrategyId = savedStrategy.customBaseStrategyId;
  const savedCustomStrategy = buildSavedCustomStrategySummary(savedStrategy);
  const hasHoldings = profiles.length > 0 && totalPortfolioValue > 0;

  // Empty portfolio: keep strategy metadata/targets, but do not invent an alignment score or drift.
  if (!hasHoldings) {
    const { targetAllocations } = buildVisibleAllocationItems(strategy, {}, targetWeights);

    return {
      strategyId: savedStrategy.strategyId,
      strategyName: strategy.name,
      strategyDescription: strategy.description,
      strategyPhilosophy: strategy.philosophy,
      investmentHorizon: strategy.investmentHorizon,
      customBaseStrategyId,
      savedCustomStrategy,
      displayCurrency,
      totalPortfolioValue: 0,
      alignmentScore: 0,
      targetAllocations,
      currentAllocations: [],
      deviations: [],
      tickerMappings: [],
    };
  }

  const { currentAllocations, targetAllocations } = buildVisibleAllocationItems(
    strategy,
    currentWeights,
    targetWeights
  );

  const tickerMappings: RebalancingTickerMappingItem[] = profiles.map((profile) => {
    const assignment = assignPositionToBucket(profile, strategy.buckets);

    return {
      ticker: profile.ticker,
      sector: profile.sector,
      marketValue: profile.marketValue,
      bucketId: assignment.bucketId,
      bucketLabel: assignment.bucketLabel,
      inferredAssetClass: profile.assetClass,
      mappingSource: assignment.mappingSource,
    };
  });

  return {
    strategyId: savedStrategy.strategyId,
    strategyName: strategy.name,
    strategyDescription: strategy.description,
    strategyPhilosophy: strategy.philosophy,
    investmentHorizon: strategy.investmentHorizon,
    customBaseStrategyId,
    savedCustomStrategy,
    displayCurrency,
    totalPortfolioValue,
    alignmentScore: computeAlignmentScore(strategy, currentWeights, targetWeights),
    targetAllocations,
    currentAllocations,
    deviations: buildDeviationItems(strategy, currentWeights, targetWeights),
    tickerMappings,
  };
}

export function listRebalancingStrategies(): RebalancingStrategyOption[] {
  return REBALANCING_PREBUILT_STRATEGIES.map((strategy) => ({
    id: strategy.id as RebalancingPrebuiltStrategyId,
    name: strategy.name,
    description: strategy.description,
    philosophy: strategy.philosophy,
    investmentHorizon: strategy.investmentHorizon,
    buckets: strategy.buckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      color: bucket.color,
      targetPercent: bucket.targetPercent,
    })),
  }));
}
