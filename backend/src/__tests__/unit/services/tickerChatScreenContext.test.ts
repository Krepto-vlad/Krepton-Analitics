import {
  buildTickerChatBacktestScreen,
  buildTickerChatCompareScreen,
  buildTickerChatDividendScreen,
  buildTickerChatMoversScreen,
  buildTickerChatNewsScreen,
  buildTickerChatPortfolioScreen,
  buildTickerChatRebalancingScreen,
  buildTickerChatTickerScreen,
  buildTickerChatWatchlistScreen,
} from '../../../services/tickerChatScreenContext.js';
import type { DividendCalendarResponse } from '../../../types/dividend.types.js';
import type { RebalancingAnalysisResponse } from '../../../types/rebalancing.types.js';
import type {
  MarketMoverItem,
  StockBacktestResponse,
  StockCompareItem,
} from '../../../types/stock.types.js';

function compareItem(ticker: string, overrides: Partial<StockCompareItem> = {}): StockCompareItem {
  return {
    ticker,
    name: ticker,
    currency: 'USD',
    price: 100,
    sector: null,
    industry: null,
    marketCap: null,
    enterpriseValue: null,
    trailingEps: null,
    peRatio: null,
    forwardPeRatio: null,
    pegRatio: null,
    psRatio: null,
    priceToBook: null,
    evToEbitda: null,
    roe: null,
    roa: null,
    profitMargin: null,
    operatingMargin: null,
    revenueGrowth: null,
    earningsGrowth: null,
    debtToEquity: null,
    currentRatio: null,
    dividendYield: null,
    payoutRatio: null,
    beta: null,
    ...overrides,
  };
}

describe('buildTickerChatCompareScreen', () => {
  it('builds prompt text and bar cards from Krepton compare rows', () => {
    const screen = buildTickerChatCompareScreen([
      compareItem('MSFT', {
        name: 'Microsoft',
        price: 420,
        peRatio: 35.2,
        revenueGrowth: 15,
        profitMargin: 35,
      }),
      compareItem('AAPL', {
        name: 'Apple',
        price: 190,
        peRatio: 28.4,
        revenueGrowth: 8,
        profitMargin: 24,
      }),
    ]);

    expect(screen.promptText).toContain('MSFT (Microsoft)');
    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.promptText).toContain('P/E 35.2x');
    expect(screen.referencePrices).toEqual([420, 190]);
    expect(screen.displayBlocks).toEqual([
      expect.objectContaining({
        kind: 'compare-bars',
        metricKey: 'peRatio',
        rows: [
          { ticker: 'MSFT', name: 'Microsoft', value: 35.2 },
          { ticker: 'AAPL', name: 'Apple', value: 28.4 },
        ],
      }),
      expect.objectContaining({ metricKey: 'revenueGrowth' }),
      expect.objectContaining({ metricKey: 'profitMargin' }),
    ]);
  });
});

describe('buildTickerChatRebalancingScreen', () => {
  it('describes drift without a trade instruction', () => {
    const analysis = {
      strategyName: 'Buffett 90/10',
      alignmentScore: 72,
      displayCurrency: 'EUR',
      totalPortfolioValue: 10000,
      deviations: [
        {
          label: 'Equities',
          currentPercent: 70,
          targetPercent: 90,
          deviationPercent: -20,
          status: 'underweight',
        },
      ],
      targetAllocations: [],
      tickerMappings: [{ ticker: 'VOO', bucketLabel: 'Equities' }],
    } as unknown as RebalancingAnalysisResponse;

    const screen = buildTickerChatRebalancingScreen(analysis);

    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.promptText).toContain('Equities: current 70.0%');
    expect(screen.promptText).toContain('VOO → Equities');
    expect(screen.displayBlocks[0]).toEqual(
      expect.objectContaining({
        kind: 'allocation-bars',
        title: 'Buffett 90/10',
        rows: [{ label: 'Equities', currentPercent: 70, targetPercent: 90 }],
      })
    );
  });
});

describe('buildTickerChatMoversScreen', () => {
  it('keeps gainer and loser prices for the chat cards', () => {
    const gainer = {
      ticker: 'NVDA',
      name: 'NVIDIA',
      price: 120,
      changePercent: 8.2,
      currency: 'USD',
    } as unknown as MarketMoverItem;
    const loser = {
      ticker: 'INTC',
      name: 'Intel',
      price: 22,
      changePercent: -6.4,
      currency: 'USD',
    } as unknown as MarketMoverItem;

    const screen = buildTickerChatMoversScreen([gainer], [loser]);

    expect(screen.promptText).toContain('NVDA (NVIDIA)');
    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.referencePrices).toEqual([120, 22]);
    expect(screen.displayBlocks).toEqual([
      expect.objectContaining({ kind: 'mover-bars', side: 'gainers' }),
      expect.objectContaining({ kind: 'mover-bars', side: 'losers' }),
    ]);
  });
});

describe('buildTickerChatBacktestScreen', () => {
  it('describes the calculated result without treating returns as prices', () => {
    const result: StockBacktestResponse = {
      amount: 1000,
      displayCurrency: 'USD',
      period: '3y',
      periodLabel: '3 Years',
      portfolio: { returnPercent: 42, finalValue: 1420, currency: 'USD' },
      holdings: [
        {
          ticker: 'AAPL',
          name: 'Apple',
          currency: 'USD',
          weightPercent: 60,
          allocatedAmount: 600,
          returnPercent: 50,
          contributionValue: 300,
        },
      ],
      benchmark: {
        label: 'S&P 500',
        ticker: 'SPY',
        returnPercent: 30,
        finalValue: 1300,
        currency: 'USD',
      },
      periodBreakdown: [
        {
          period: '1y',
          label: '1Y',
          portfolioReturnPercent: 10,
          benchmarkReturnPercent: 8,
        },
      ],
    };

    const screen = buildTickerChatBacktestScreen(result);

    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.promptText).toContain('USD 1000.00');
    expect(screen.promptText).toContain('AAPL (Apple)');
    expect(screen.promptText).toContain('+42.0%');
    expect(screen.referencePrices).toEqual([]);
    expect(screen.displayBlocks).toEqual([
      {
        kind: 'backtest-bars',
        title: '3 Years',
        rows: [
          { label: 'Portfolio', returnPercent: 42 },
          { label: 'S&P 500', returnPercent: 30 },
          { label: 'AAPL', returnPercent: 50 },
        ],
      },
    ]);
  });
});

describe('buildTickerChatDividendScreen', () => {
  it('lists monthly totals and does not treat payouts as share prices', () => {
    const calendar: DividendCalendarResponse = {
      displayCurrency: 'USD',
      chartYear: 2026,
      summary: { annualIncome: 120, avgMonthlyIncome: 10, remainingYearIncome: 40 },
      monthlyPayouts: [
        {
          month: 3,
          year: 2026,
          label: 'Mar',
          dividendTotal: 12,
          couponTotal: 0,
          total: 12,
          isProjected: true,
        },
      ],
      upcomingPayments: [],
    };

    const screen = buildTickerChatDividendScreen(calendar);

    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.promptText).toContain('USD 120.00');
    expect(screen.promptText).toContain('None.');
    expect(screen.referencePrices).toEqual([]);
    expect(screen.displayBlocks).toEqual([
      {
        kind: 'payout-bars',
        title: '2026 payouts',
        currency: 'USD',
        rows: [{ label: 'Mar', amount: 12 }],
      },
    ]);
  });
});

describe('buildTickerChatTickerScreen', () => {
  it('describes the chart period and fundamentals from Krepton data', () => {
    const screen = buildTickerChatTickerScreen({
      ticker: 'AAPL',
      periodLabel: '1Y',
      fundamentals: compareItem('AAPL', {
        name: 'Apple',
        price: 190,
        peRatio: 28.4,
        revenueGrowth: 8,
        profitMargin: 24,
      }),
      startPrice: 100,
      endPrice: 120,
      returnPercent: 20,
    });

    expect(screen.promptText).toContain('Do not tell the user to buy, sell, or size a trade.');
    expect(screen.promptText).toContain('Period: 1Y.');
    expect(screen.promptText).toContain('P/E 28.4x');
    expect(screen.referencePrices).toEqual([100, 120, 190]);
    expect(screen.displayBlocks[0]).toEqual({
      kind: 'backtest-bars',
      title: '1Y',
      rows: [{ label: 'AAPL', returnPercent: 20 }],
    });
    expect(screen.displayBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'compare-bars', metricKey: 'peRatio' }),
      ])
    );
  });
});

describe('buildTickerChatPortfolioScreen', () => {
  it('says the portfolio is empty when no holding has a value', () => {
    const screen = buildTickerChatPortfolioScreen('USD', []);

    expect(screen.promptText).toContain('- None.');
    expect(screen.promptText).toContain('All holdings are listed.');
    expect(screen.displayBlocks).toEqual([]);
    expect(screen.referencePrices).toEqual([]);
  });

  it('lists the largest weights and counts the rest', () => {
    const holdings = Array.from({ length: 13 }, (_, index) => ({
      ticker: `T${index}`,
      name: index === 0 ? '   ' : `Name ${index}`,
      sector: index === 0 ? '   ' : 'Technology',
      marketValue: 13 - index,
    }));
    const screen = buildTickerChatPortfolioScreen('EUR', holdings);
    const weightBlock = screen.displayBlocks[0];

    expect(screen.promptText).toContain('Smaller holdings not listed: 1.');
    expect(screen.promptText).toContain('sector unknown');
    expect(weightBlock?.kind).toBe('weight-bars');
    if (weightBlock?.kind === 'weight-bars') {
      expect(weightBlock.rows).toHaveLength(12);
      expect(weightBlock.rows[0]?.label).toBe('T0');
    }
  });
});

describe('buildTickerChatNewsScreen', () => {
  it('drops headlines that have no ticker and reports none left', () => {
    const screen = buildTickerChatNewsScreen([
      {
        id: '1',
        headline: '   ',
        source: '',
        url: 'https://example.com/secret',
        timeAgo: '1h',
        publishedAt: '2026-10-20',
        tickers: [],
      },
    ]);

    expect(screen.promptText).toContain('- None.');
    expect(screen.promptText).not.toContain('https://');
    expect(screen.displayBlocks).toEqual([]);
  });
});

describe('buildTickerChatWatchlistScreen', () => {
  it('says the watchlist is empty', () => {
    const screen = buildTickerChatWatchlistScreen([]);

    expect(screen.promptText).toContain('- None.');
    expect(screen.displayBlocks).toEqual([]);
    expect(screen.referencePrices).toEqual([]);
  });
});
