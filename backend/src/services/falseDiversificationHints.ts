import {
  ALIGNMENT_PROMPT_HOLDINGS_LIMIT,
  FALSE_DIVERSIFICATION_MIN_CLUSTER_TICKERS,
  FALSE_DIVERSIFICATION_MIN_HOLDING_WEIGHT_PERCENT,
  FALSE_DIVERSIFICATION_TOP_SECTORS_LIMIT,
  FALSE_DIVERSIFICATION_UNKNOWN_SECTOR_LABEL,
  OVERLAPPING_EQUITY_ETF_CLUSTERS,
} from '../constants/falseDiversification.constants.js';
import type {
  AlignmentFalseDiversificationHints,
  AlignmentPromptHolding,
} from '../types/ai.types.js';
import type { RebalancingAnalysisResponse } from '../types/rebalancing.types.js';

function roundWeightPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildAlignmentHoldingsForPrompt(
  analysis: RebalancingAnalysisResponse
): AlignmentPromptHolding[] {
  if (analysis.totalPortfolioValue <= 0) {
    return [];
  }

  return [...analysis.tickerMappings]
    .sort((left, right) => right.marketValue - left.marketValue)
    .slice(0, ALIGNMENT_PROMPT_HOLDINGS_LIMIT)
    .map((item) => ({
      ticker: item.ticker,
      bucketLabel: item.bucketLabel,
      marketValue: item.marketValue,
      weightPercent: roundWeightPercent((item.marketValue / analysis.totalPortfolioValue) * 100),
      sector: item.sector,
    }));
}

export function buildFalseDiversificationHints(
  holdings: AlignmentPromptHolding[]
): AlignmentFalseDiversificationHints {
  const materialTickers = new Set(
    holdings
      .filter(
        (holding) => holding.weightPercent >= FALSE_DIVERSIFICATION_MIN_HOLDING_WEIGHT_PERCENT
      )
      .map((holding) => holding.ticker.toUpperCase())
  );

  const overlappingClusters = OVERLAPPING_EQUITY_ETF_CLUSTERS.flatMap((cluster) => {
    const tickersPresent = cluster.tickers.filter((ticker) =>
      materialTickers.has(ticker.toUpperCase())
    );

    if (tickersPresent.length < FALSE_DIVERSIFICATION_MIN_CLUSTER_TICKERS) {
      return [];
    }

    return [
      {
        label: cluster.label,
        tickersPresent: [...tickersPresent],
        note: cluster.note,
      },
    ];
  });

  const sectorTotals = new Map<string, number>();

  for (const holding of holdings) {
    const sectorLabel = holding.sector?.trim() || FALSE_DIVERSIFICATION_UNKNOWN_SECTOR_LABEL;
    sectorTotals.set(sectorLabel, (sectorTotals.get(sectorLabel) ?? 0) + holding.weightPercent);
  }

  const topSectors = [...sectorTotals.entries()]
    .map(([sector, weightPercent]) => ({
      sector,
      weightPercent: roundWeightPercent(weightPercent),
    }))
    .sort((left, right) => right.weightPercent - left.weightPercent)
    .slice(0, FALSE_DIVERSIFICATION_TOP_SECTORS_LIMIT);

  return {
    overlappingClusters,
    topSectors,
  };
}
