jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn(),
}));

import { getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import {
  buildRebalancingAnalysis,
  listRebalancingStrategies,
  resolveTargetBucketWeights,
  validateUpdateRebalancingStrategyDto,
} from '../../../services/rebalancingService.js';
import type { PositionRow } from '../../../types/portfolio.types.js';
import type { SavedRebalancingStrategy } from '../../../types/rebalancing.types.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';

const mockedGetQuotes = getCachedStockQuotes as jest.MockedFunction<typeof getCachedStockQuotes>;

function buildQuote(ticker: string, price: number) {
  return { ...buildEmptyStockQuote(ticker), price };
}

function buildPosition(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
    id: 'pos-1',
    portfolio_id: 'pf-1',
    ticker: 'VOO',
    company_name: 'Vanguard S&P 500',
    shares: '10',
    avg_buy_price: '100',
    currency: 'USD',
    sector: null,
    entry_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

const buffettStrategy: SavedRebalancingStrategy = {
  strategyId: 'warren-buffett-9010',
  customBaseStrategyId: null,
  customAllocations: null,
};

describe('rebalancingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUpdateRebalancingStrategyDto', () => {
    it('rejects an unknown prebuilt strategy id', () => {
      expect(() =>
        validateUpdateRebalancingStrategyDto({
          strategyId: 'not-a-strategy' as SavedRebalancingStrategy['strategyId'],
        })
      ).toThrow(expect.objectContaining({ statusCode: 400 }));
    });

    it('rejects custom allocations that do not sum to 100', () => {
      expect(() =>
        validateUpdateRebalancingStrategyDto({
          strategyId: 'custom',
          customBaseStrategyId: 'warren-buffett-9010',
          customAllocations: {
            'large-cap-equities': 50,
            'short-term-treasuries': 10,
          },
        })
      ).toThrow(/sum to 100/);
    });

    it('accepts a valid custom 90/10 split', () => {
      expect(() =>
        validateUpdateRebalancingStrategyDto({
          strategyId: 'custom',
          customBaseStrategyId: 'warren-buffett-9010',
          customAllocations: {
            'large-cap-equities': 90,
            'short-term-treasuries': 10,
          },
        })
      ).not.toThrow();
    });
  });

  describe('resolveTargetBucketWeights', () => {
    it('returns prebuilt target percents', () => {
      expect(resolveTargetBucketWeights(buffettStrategy)).toEqual({
        'large-cap-equities': 90,
        'short-term-treasuries': 10,
      });
    });
  });

  describe('listRebalancingStrategies', () => {
    it('lists every prebuilt strategy with bucket targets', () => {
      const strategies = listRebalancingStrategies();

      expect(strategies.length).toBeGreaterThanOrEqual(4);
      expect(strategies.map((item) => item.id)).toContain('warren-buffett-9010');
      const buffett = strategies.find((item) => item.id === 'warren-buffett-9010');
      expect(buffett?.buckets.reduce((sum, bucket) => sum + bucket.targetPercent, 0)).toBe(100);
    });
  });

  describe('buildRebalancingAnalysis', () => {
    it('returns empty allocations without inventing an alignment score', async () => {
      const result = await buildRebalancingAnalysis([], buffettStrategy, 'USD');

      expect(mockedGetQuotes).not.toHaveBeenCalled();
      expect(result.totalPortfolioValue).toBe(0);
      expect(result.alignmentScore).toBe(0);
      expect(result.currentAllocations).toEqual([]);
      expect(result.deviations).toEqual([]);
      expect(result.targetAllocations.some((item) => item.bucketId === 'large-cap-equities')).toBe(
        true
      );
    });

    it('maps all-equity holdings as overweight vs 90/10', async () => {
      mockedGetQuotes.mockResolvedValue([buildQuote('VOO', 100)]);

      const result = await buildRebalancingAnalysis([buildPosition()], buffettStrategy, 'USD');

      expect(result.totalPortfolioValue).toBe(1000);
      expect(result.alignmentScore).toBe(90);
      expect(result.tickerMappings).toEqual([
        expect.objectContaining({
          ticker: 'VOO',
          bucketId: 'large-cap-equities',
          mappingSource: 'asset_class',
        }),
      ]);

      const equityDeviation = result.deviations.find(
        (item) => item.bucketId === 'large-cap-equities'
      );
      expect(equityDeviation?.status).toBe('overweight');
      expect(equityDeviation?.currentPercent).toBe(100);
      expect(equityDeviation?.targetPercent).toBe(90);
    });

    it('marks a 90/10 mix as optimal within the 2% band', async () => {
      mockedGetQuotes.mockResolvedValue([buildQuote('VOO', 90), buildQuote('SHY', 10)]);

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'eq', ticker: 'VOO', shares: '1', avg_buy_price: '90' }),
          buildPosition({
            id: 'bond',
            ticker: 'SHY',
            company_name: 'iShares 1-3 Year Treasury',
            shares: '1',
            avg_buy_price: '10',
          }),
        ],
        buffettStrategy,
        'USD'
      );

      expect(result.totalPortfolioValue).toBe(100);
      expect(result.alignmentScore).toBe(100);
      expect(result.deviations.every((item) => item.status === 'optimal')).toBe(true);
    });
  });
});
