import {
  buildAlignmentHoldingsForPrompt,
  buildFalseDiversificationHints,
} from '../../../services/falseDiversificationHints.js';
import type { RebalancingAnalysisResponse } from '../../../types/rebalancing.types.js';

function buildAnalysis(
  mappings: RebalancingAnalysisResponse['tickerMappings'],
  totalPortfolioValue = 10000
): RebalancingAnalysisResponse {
  return {
    strategyId: 'bogleheads-three-fund',
    strategyName: 'Bogleheads Three-Fund',
    strategyDescription: 'Test',
    strategyPhilosophy: 'Test philosophy',
    investmentHorizon: '5+ years',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    displayCurrency: 'USD',
    totalPortfolioValue,
    alignmentScore: 70,
    targetAllocations: [],
    currentAllocations: [],
    deviations: [],
    tickerMappings: mappings,
    includePermanentCash: true,
  };
}

describe('falseDiversificationHints', () => {
  it('includes weight percent and sector on prompt holdings', () => {
    const analysis = buildAnalysis([
      {
        ticker: 'VOO',
        sector: 'N/A',
        marketValue: 6000,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
      {
        ticker: 'BND',
        sector: 'N/A',
        marketValue: 4000,
        bucketId: 'bonds',
        bucketLabel: 'Bonds',
        inferredAssetClass: 'bond',
        mappingSource: 'ticker',
      },
    ]);

    const holdings = buildAlignmentHoldingsForPrompt(analysis);

    expect(holdings).toHaveLength(2);
    expect(holdings[0]).toMatchObject({
      ticker: 'VOO',
      weightPercent: 60,
      sector: 'N/A',
    });
  });

  it('detects known overlapping ETF clusters when multiple family tickers are present', () => {
    const analysis = buildAnalysis([
      {
        ticker: 'VOO',
        sector: 'Technology',
        marketValue: 4000,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
      {
        ticker: 'QQQ',
        sector: 'Technology',
        marketValue: 3500,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
      {
        ticker: 'VUG',
        sector: 'Technology',
        marketValue: 2500,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
    ]);

    const holdings = buildAlignmentHoldingsForPrompt(analysis);
    const hints = buildFalseDiversificationHints(holdings);

    expect(hints.overlappingClusters.length).toBeGreaterThan(0);
    expect(
      hints.overlappingClusters.some(
        (cluster) =>
          cluster.tickersPresent.includes('VOO') && cluster.tickersPresent.includes('QQQ')
      )
    ).toBe(true);
    expect(hints.topSectors[0]?.sector).toBe('Technology');
  });

  it('returns no overlap clusters for a single equity ETF', () => {
    const analysis = buildAnalysis([
      {
        ticker: 'VOO',
        sector: 'Technology',
        marketValue: 10000,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
    ]);

    const holdings = buildAlignmentHoldingsForPrompt(analysis);
    const hints = buildFalseDiversificationHints(holdings);

    expect(hints.overlappingClusters).toHaveLength(0);
  });
});
