jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn(),
}));

jest.mock('../../../services/fundProfileService.js', () => ({
  getFundProfileSnapshots: jest.fn().mockResolvedValue(new Map()),
}));

import { getFundProfileSnapshots } from '../../../services/fundProfileService.js';
import type { FundProfileSnapshot } from '../../../services/fundProfileService.js';
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
const mockedFundProfiles = getFundProfileSnapshots as jest.MockedFunction<
  typeof getFundProfileSnapshots
>;

function buildQuote(
  ticker: string,
  price: number,
  overrides: Partial<ReturnType<typeof buildEmptyStockQuote>> = {}
) {
  return { ...buildEmptyStockQuote(ticker), price, ...overrides };
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

const allWeatherStrategy: SavedRebalancingStrategy = {
  strategyId: 'ray-dalio-all-weather',
  customBaseStrategyId: null,
  customAllocations: null,
};

const threeFundStrategy: SavedRebalancingStrategy = {
  strategyId: 'bogleheads-three-fund',
  customBaseStrategyId: null,
  customAllocations: null,
};

const permanentStrategy: SavedRebalancingStrategy = {
  strategyId: 'harry-browne-permanent',
  customBaseStrategyId: null,
  customAllocations: null,
};

function fundProfile(
  categoryName: string,
  stockPosition: number | null = null
): FundProfileSnapshot {
  return { categoryName, stockPosition };
}

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

    it('maps an S&P 500 fund as overweight vs 90/10', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('VOO', 100, { quoteType: 'ETF', name: 'Vanguard S&P 500 ETF' }),
      ]);
      mockedFundProfiles.mockResolvedValue(new Map([['VOO', fundProfile('Large Blend', 1)]]));

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
      mockedGetQuotes.mockResolvedValue([
        buildQuote('VOO', 90, { quoteType: 'ETF', name: 'Vanguard S&P 500 ETF' }),
        buildQuote('SHY', 10, { quoteType: 'ETF', name: 'iShares 1-3 Year Treasury Bond ETF' }),
      ]);
      mockedFundProfiles.mockResolvedValue(
        new Map([
          ['VOO', fundProfile('Large Blend', 1)],
          ['SHY', fundProfile('Short Government', 0)],
        ])
      );

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

    it('leaves a single stock and an intermediate treasury outside the 90/10 sleeves', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('AAPL', 50, { quoteType: 'EQUITY', name: 'Apple Inc.' }),
        buildQuote('IEF', 50, { quoteType: 'ETF', name: 'iShares 7-10 Year Treasury Bond ETF' }),
      ]);
      mockedFundProfiles.mockResolvedValue(new Map([['IEF', fundProfile('Long Government', 0)]]));

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'aapl', ticker: 'AAPL', shares: '1', avg_buy_price: '50' }),
          buildPosition({ id: 'ief', ticker: 'IEF', shares: '1', avg_buy_price: '50' }),
        ],
        buffettStrategy,
        'USD'
      );

      expect(result.tickerMappings.map((mapping) => mapping.bucketId)).toEqual([
        'unmapped',
        'unmapped',
      ]);
    });

    it('maps All-Weather sleeves from fund category and keeps non-sleeves unmapped', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('VOO', 100, { quoteType: 'ETF', name: 'Vanguard S&P 500 ETF' }),
        buildQuote('VTI', 100, { quoteType: 'ETF', name: 'Vanguard Total Stock Market ETF' }),
        buildQuote('VXUS', 100, {
          quoteType: 'ETF',
          name: 'Vanguard Total International Stock ETF',
        }),
        buildQuote('AAPL', 100, { quoteType: 'EQUITY', name: 'Apple Inc.' }),
        buildQuote('NEM', 100, { quoteType: 'EQUITY', name: 'Newmont Corporation' }),
        buildQuote('XOM', 100, { quoteType: 'EQUITY', name: 'Exxon Mobil Corporation' }),
        buildQuote('TLT', 100, { quoteType: 'ETF', name: 'iShares 20+ Year Treasury Bond ETF' }),
        buildQuote('IEF', 100, { quoteType: 'ETF', name: 'iShares 7-10 Year Treasury Bond ETF' }),
        buildQuote('GLD', 100, { quoteType: 'ETF', name: 'SPDR Gold Shares' }),
        buildQuote('DBC', 100, {
          quoteType: 'ETF',
          name: 'Invesco DB Commodity Index Tracking Fund',
        }),
        buildQuote('BND', 100, { quoteType: 'ETF', name: 'Vanguard Total Bond Market ETF' }),
        buildQuote('SHY', 100, { quoteType: 'ETF', name: 'iShares 1-3 Year Treasury Bond ETF' }),
        buildQuote('IEI', 100, { quoteType: 'ETF', name: 'iShares 3-7 Year Treasury Bond ETF' }),
        buildQuote('USO', 100, { quoteType: 'ETF', name: 'United States Oil Fund' }),
      ]);
      mockedFundProfiles.mockResolvedValue(
        new Map([
          ['VOO', fundProfile('Large Blend', 1)],
          ['VTI', fundProfile('Large Blend', 1)],
          ['VXUS', fundProfile('Foreign Large Blend', 1)],
          ['TLT', fundProfile('Long Government')],
          ['IEF', fundProfile('Long Government')],
          ['GLD', fundProfile('Commodities Focused', 0)],
          ['DBC', fundProfile('Commodities Broad Basket', 0.02)],
          ['BND', fundProfile('Intermediate Core Bond', 0)],
          ['SHY', fundProfile('Short Government', 0)],
          ['IEI', fundProfile('Intermediate Government', 0)],
          ['USO', fundProfile('Commodities Focused', 0)],
        ])
      );

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'voo', ticker: 'VOO' }),
          buildPosition({ id: 'vti', ticker: 'VTI' }),
          buildPosition({ id: 'vxus', ticker: 'VXUS' }),
          buildPosition({ id: 'aapl', ticker: 'AAPL' }),
          buildPosition({ id: 'nem', ticker: 'NEM', sector: 'Basic Materials' }),
          buildPosition({ id: 'xom', ticker: 'XOM', sector: 'Energy' }),
          buildPosition({ id: 'tlt', ticker: 'TLT' }),
          buildPosition({ id: 'ief', ticker: 'IEF' }),
          buildPosition({ id: 'gld', ticker: 'GLD' }),
          buildPosition({ id: 'dbc', ticker: 'DBC' }),
          buildPosition({ id: 'bnd', ticker: 'BND' }),
          buildPosition({ id: 'shy', ticker: 'SHY' }),
          buildPosition({ id: 'iei', ticker: 'IEI' }),
          buildPosition({ id: 'uso', ticker: 'USO' }),
        ],
        allWeatherStrategy,
        'USD'
      );

      const bucketByTicker = new Map(
        result.tickerMappings.map((mapping) => [mapping.ticker, mapping.bucketId])
      );

      expect(bucketByTicker.get('VOO')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('VTI')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('VXUS')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('AAPL')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('NEM')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('XOM')).toBe('large-cap-stocks');
      expect(bucketByTicker.get('TLT')).toBe('long-term-bonds');
      expect(bucketByTicker.get('IEF')).toBe('intermediate-bonds');
      expect(bucketByTicker.get('GLD')).toBe('gold');
      expect(bucketByTicker.get('DBC')).toBe('commodities');
      expect(bucketByTicker.get('BND')).toBe('unmapped');
      expect(bucketByTicker.get('SHY')).toBe('unmapped');
      expect(bucketByTicker.get('IEI')).toBe('unmapped');
      expect(bucketByTicker.get('USO')).toBe('unmapped');
    });

    it('maps only the three total-market funds and leaves substitutes unmapped', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('VTI', 60, { quoteType: 'ETF', name: 'Vanguard Total Stock Market ETF' }),
        buildQuote('VXUS', 20, {
          quoteType: 'ETF',
          name: 'Vanguard Total International Stock ETF',
        }),
        buildQuote('BND', 20, { quoteType: 'ETF', name: 'Vanguard Total Bond Market ETF' }),
        buildQuote('AAPL', 10, { quoteType: 'EQUITY', name: 'Apple Inc.' }),
        buildQuote('VOO', 10, { quoteType: 'ETF', name: 'Vanguard S&P 500 ETF' }),
        buildQuote('VWO', 10, { quoteType: 'ETF', name: 'Vanguard FTSE Emerging Markets ETF' }),
        buildQuote('VT', 10, { quoteType: 'ETF', name: 'Vanguard Total World Stock ETF' }),
        buildQuote('TLT', 10, { quoteType: 'ETF', name: 'iShares 20+ Year Treasury Bond ETF' }),
      ]);
      mockedFundProfiles.mockResolvedValue(
        new Map([
          ['VTI', fundProfile('Large Blend', 1)],
          ['VXUS', fundProfile('Foreign Large Blend', 1)],
          ['BND', fundProfile('Intermediate Core Bond', 0)],
          ['VOO', fundProfile('Large Blend', 1)],
          ['VWO', fundProfile('Diversified Emerging Mkts', 1)],
          ['VT', fundProfile('Foreign Large Blend', 1)],
          ['TLT', fundProfile('Long Government', 0)],
        ])
      );

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'vti', ticker: 'VTI', shares: '1', avg_buy_price: '60' }),
          buildPosition({ id: 'vxus', ticker: 'VXUS', shares: '1', avg_buy_price: '20' }),
          buildPosition({ id: 'bnd', ticker: 'BND', shares: '1', avg_buy_price: '20' }),
          buildPosition({ id: 'aapl', ticker: 'AAPL', shares: '1', avg_buy_price: '10' }),
          buildPosition({ id: 'voo', ticker: 'VOO', shares: '1', avg_buy_price: '10' }),
          buildPosition({ id: 'vwo', ticker: 'VWO', shares: '1', avg_buy_price: '10' }),
          buildPosition({ id: 'vt', ticker: 'VT', shares: '1', avg_buy_price: '10' }),
          buildPosition({ id: 'tlt', ticker: 'TLT', shares: '1', avg_buy_price: '10' }),
        ],
        threeFundStrategy,
        'USD'
      );

      const bucketByTicker = new Map(
        result.tickerMappings.map((mapping) => [mapping.ticker, mapping.bucketId])
      );

      expect(bucketByTicker.get('VTI')).toBe('us-world-stocks');
      expect(bucketByTicker.get('VXUS')).toBe('emerging-markets');
      expect(bucketByTicker.get('BND')).toBe('investment-grade-bonds');
      expect(bucketByTicker.get('AAPL')).toBe('unmapped');
      expect(bucketByTicker.get('VOO')).toBe('unmapped');
      expect(bucketByTicker.get('VWO')).toBe('unmapped');
      expect(bucketByTicker.get('VT')).toBe('unmapped');
      expect(bucketByTicker.get('TLT')).toBe('unmapped');
    });

    it('keeps only Treasury bills in the permanent cash sleeve', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('BIL', 25, { quoteType: 'ETF', name: 'SPDR Bloomberg 1-3 Month T-Bill ETF' }),
        buildQuote('SHY', 25, { quoteType: 'ETF', name: 'iShares 1-3 Year Treasury Bond ETF' }),
        buildQuote('VMFXX', 25, {
          quoteType: 'MONEYMARKET',
          name: 'Vanguard Federal Money Market Fund',
        }),
      ]);
      mockedFundProfiles.mockResolvedValue(
        new Map([
          ['BIL', fundProfile('Ultrashort Bond', 0)],
          ['SHY', fundProfile('Short Government', 0)],
        ])
      );

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'bil', ticker: 'BIL', shares: '1', avg_buy_price: '25' }),
          buildPosition({ id: 'shy', ticker: 'SHY', shares: '1', avg_buy_price: '25' }),
          buildPosition({ id: 'vmfxx', ticker: 'VMFXX', shares: '1', avg_buy_price: '25' }),
        ],
        permanentStrategy,
        'USD'
      );

      const bucketByTicker = new Map(
        result.tickerMappings.map((mapping) => [mapping.ticker, mapping.bucketId])
      );

      expect(bucketByTicker.get('BIL')).toBe('cash');
      expect(bucketByTicker.get('SHY')).toBe('unmapped');
      expect(bucketByTicker.get('VMFXX')).toBe('unmapped');
    });

    it('scores the other permanent sleeves as 100% when cash is left out', async () => {
      mockedGetQuotes.mockResolvedValue([
        buildQuote('VTI', 100, { quoteType: 'ETF', name: 'Vanguard Total Stock Market ETF' }),
        buildQuote('TLT', 100, { quoteType: 'ETF', name: 'iShares 20+ Year Treasury Bond ETF' }),
        buildQuote('GLD', 100, { quoteType: 'ETF', name: 'SPDR Gold Shares' }),
      ]);
      mockedFundProfiles.mockResolvedValue(
        new Map([
          ['VTI', fundProfile('Large Blend', 1)],
          ['TLT', fundProfile('Long Government', 0)],
          ['GLD', fundProfile('Commodities Focused', 0)],
        ])
      );

      const result = await buildRebalancingAnalysis(
        [
          buildPosition({ id: 'vti', ticker: 'VTI', shares: '1', avg_buy_price: '100' }),
          buildPosition({ id: 'tlt', ticker: 'TLT', shares: '1', avg_buy_price: '100' }),
          buildPosition({ id: 'gld', ticker: 'GLD', shares: '1', avg_buy_price: '100' }),
        ],
        { ...permanentStrategy, includePermanentCash: false },
        'USD'
      );

      expect(result.includePermanentCash).toBe(false);
      expect(result.alignmentScore).toBe(100);
      expect(result.targetAllocations.map((item) => item.bucketId)).toEqual([
        'stocks',
        'long-bonds',
        'gold',
      ]);
      expect(result.deviations.every((item) => item.status === 'optimal')).toBe(true);
    });

    it('scores a custom permanent target without rewriting the saved slider weights', async () => {
      const result = await buildRebalancingAnalysis(
        [],
        {
          strategyId: 'custom',
          customBaseStrategyId: 'harry-browne-permanent',
          customAllocations: {
            stocks: 40,
            'long-bonds': 30,
            gold: 20,
            cash: 10,
          },
          includePermanentCash: false,
        },
        'USD'
      );

      expect(
        result.savedCustomStrategy?.targetAllocations.map((item) => [
          item.bucketId,
          item.weightPercent,
        ])
      ).toEqual([
        ['stocks', 40],
        ['long-bonds', 30],
        ['gold', 20],
        ['cash', 10],
      ]);
      expect(result.targetAllocations.map((item) => item.bucketId)).toEqual([
        'stocks',
        'long-bonds',
        'gold',
      ]);
      expect(result.targetAllocations.reduce((sum, item) => sum + item.weightPercent, 0)).toBe(100);
    });
  });
});
