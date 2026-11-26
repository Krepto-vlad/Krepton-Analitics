import {
  BACKTEST_ALLOCATION_TOLERANCE,
  BACKTEST_ALLOCATION_TOTAL_PERCENT,
  BACKTEST_MAX_AMOUNT,
  BACKTEST_MAX_TICKERS,
  BACKTEST_MIN_AMOUNT,
  BACKTEST_MIN_TICKERS,
  STOCK_COMPARE_MAX_TICKERS,
  STOCK_COMPARE_MIN_TICKERS,
  TICKER_CHAT_CHART_INTERVAL,
  TICKER_CHAT_CHART_PERIOD_LABELS,
  TICKER_CHAT_CHART_PERIODS,
  TICKER_CHAT_COMPARE_BAR_METRICS,
  TICKER_CHAT_PAIR_TOPICS,
  TICKER_CHAT_REBALANCING_MAX_MAPPINGS,
  TICKER_CHAT_SCREEN_HEADLINE_MAX_CHARS,
  TICKER_CHAT_SCREEN_MAX_PAYMENTS,
  TICKER_CHAT_SCREEN_MAX_ROWS,
  TICKER_CHAT_WEIGHT_PERCENT_SCALE,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  TickerChatAllocationBarRow,
  TickerChatCompareBarsBlock,
  TickerChatDisplayBlock,
} from '../types/ai.types.js';
import type { DividendCalendarResponse } from '../types/dividend.types.js';
import type { PortfolioNewsItem } from '../types/news.types.js';
import type { RebalancingAnalysisResponse } from '../types/rebalancing.types.js';
import type {
  MarketMoverItem,
  OhlcvCandle,
  StockBacktestResponse,
  StockCompareItem,
  StockQuote,
} from '../types/stock.types.js';
import { getTodayIsoDate, parseDisplayCurrency } from '../utils/displayCurrency.js';
import {
  assertValidTickerSymbol,
  isMarketIndexTicker,
  TICKER_FORMAT_ERROR_MESSAGE,
} from '../utils/tickerValidation.js';
import { isBacktestPeriod, runStockBacktest } from './backtestService.js';
import { convertAmountForDisplay } from './currencyConversionService.js';
import { getMarketMovers } from './marketMoversService.js';
import {
  getUserPortfolioDividendCalendar,
  getUserPortfolioNews,
  getUserPortfolioRebalancingAnalysis,
  getUserPositions,
} from './portfolioService.js';
import { getCachedStockQuotes } from './quoteCacheService.js';
import { getStockCompare, getStockFundamentals, getStockHistory } from './stockService.js';
import { getUserWatchlist } from './watchlistService.js';

export interface ResolvedTickerChatScreen {
  promptText: string;
  displayBlocks: TickerChatDisplayBlock[];
  referencePrices: number[];
}

function readFiniteNumber(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatMultiple(value: number | null): string {
  return value === null ? 'n/a' : `${value.toFixed(1)}x`;
}

function formatPercent(value: number | null): string {
  return value === null ? 'n/a' : `${value.toFixed(1)}%`;
}

function formatIndexLevel(amount: number): string {
  return amount.toFixed(2);
}

function formatPrice(item: StockCompareItem): string {
  const price = readFiniteNumber(item.price);
  if (price === null) {
    return 'n/a';
  }

  if (isMarketIndexTicker(item.ticker)) {
    return formatIndexLevel(price);
  }

  return `${item.currency} ${price.toFixed(2)}`;
}

function metricValue(
  item: StockCompareItem,
  metricKey: TickerChatCompareBarsBlock['metricKey']
): number | null {
  return readFiniteNumber(item[metricKey]);
}

export function buildTickerChatCompareScreen(items: StockCompareItem[]): ResolvedTickerChatScreen {
  const lines = items.map((item) => {
    const name = item.name.trim() || item.ticker;
    return [
      `- ${item.ticker} (${name}): price ${formatPrice(item)},`,
      `P/E ${formatMultiple(metricValue(item, 'peRatio'))},`,
      `revenue growth ${formatPercent(metricValue(item, 'revenueGrowth'))},`,
      `profit margin ${formatPercent(metricValue(item, 'profitMargin'))}.`,
    ].join(' ');
  });

  const displayBlocks: TickerChatDisplayBlock[] = TICKER_CHAT_COMPARE_BAR_METRICS.map((metric) => ({
    kind: 'compare-bars',
    metricKey: metric.key,
    title: metric.title,
    unit: metric.unit,
    rows: items.map((item) => ({
      ticker: item.ticker,
      name: item.name.trim() || item.ticker,
      value: metricValue(item, metric.key),
    })),
  }));

  const promptText = [
    'OPEN PAGE SNAPSHOT — a comparison they selected in Krepton.',
    'Background only. Use these figures only if the user asked about this comparison.',
    'Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton data. Bar cards in the chat use the same P/E, revenue growth, and profit margin.',
    'Do not invent different values.',
    ...lines,
  ].join('\n');

  return {
    promptText,
    displayBlocks,
    referencePrices: items
      .map((item) => readFiniteNumber(item.price))
      .filter((price): price is number => price !== null && price > 0),
  };
}

type TickerChatChartPeriod = (typeof TICKER_CHAT_CHART_PERIODS)[number];

function isTickerChatChartPeriod(value: string): value is TickerChatChartPeriod {
  return (TICKER_CHAT_CHART_PERIODS as readonly string[]).includes(value);
}

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatChartPoint(ticker: string, currency: string, amount: number): string {
  return isMarketIndexTicker(ticker)
    ? `level ${formatIndexLevel(amount)}`
    : formatMoney(currency, amount);
}

function periodReturnFromCandles(
  candles: OhlcvCandle[]
): { startPrice: number; endPrice: number; returnPercent: number } | null {
  const startPrice = candles[0]?.close;
  const endPrice = candles[candles.length - 1]?.close;
  if (
    typeof startPrice !== 'number' ||
    typeof endPrice !== 'number' ||
    !Number.isFinite(startPrice) ||
    !Number.isFinite(endPrice) ||
    startPrice <= 0
  ) {
    return null;
  }

  return {
    startPrice,
    endPrice,
    returnPercent: ((endPrice - startPrice) / startPrice) * 100,
  };
}

export function buildTickerChatDividendScreen(
  calendar: DividendCalendarResponse
): ResolvedTickerChatScreen {
  const currency = calendar.displayCurrency;
  const months = calendar.monthlyPayouts.slice(0, TICKER_CHAT_SCREEN_MAX_PAYMENTS);
  const payments = calendar.upcomingPayments.slice(0, TICKER_CHAT_SCREEN_MAX_PAYMENTS);
  const monthLines = months.map(
    (month) =>
      `- ${month.label}: ${formatMoney(currency, month.total)} (${month.isProjected ? 'projected' : 'scheduled'}).`
  );
  const paymentLines =
    payments.length === 0
      ? ['- None.']
      : payments.map((payment) => {
          const name = payment.companyName.trim() || payment.ticker;
          return `- ${payment.ticker} (${name}) on ${payment.paymentDate}: ${formatMoney(currency, payment.totalAmount)}, ${payment.isProjected ? 'projected' : 'scheduled'}.`;
        });

  const promptText = [
    'OPEN PAGE SNAPSHOT — the dividend calendar for this portfolio in Krepton.',
    'Explain the projected income. Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton data. The bar card uses the same monthly totals.',
    'Do not invent different values.',
    `Currency: ${currency}. Year: ${calendar.chartYear}.`,
    `Annual income: ${formatMoney(currency, calendar.summary.annualIncome)}.`,
    `Average monthly income: ${formatMoney(currency, calendar.summary.avgMonthlyIncome)}.`,
    `Remaining this year: ${formatMoney(currency, calendar.summary.remainingYearIncome)}.`,
    'Monthly totals:',
    ...monthLines,
    'Upcoming payments:',
    ...paymentLines,
  ].join('\n');

  return {
    promptText,
    displayBlocks: [
      {
        kind: 'payout-bars',
        title: `${calendar.chartYear} payouts`,
        currency,
        rows: months.map((month) => ({ label: month.label, amount: month.total })),
      },
    ],
    referencePrices: [],
  };
}

export function buildTickerChatTickerScreen(params: {
  ticker: string;
  periodLabel: string;
  fundamentals: StockCompareItem;
  startPrice: number;
  endPrice: number;
  returnPercent: number;
}): ResolvedTickerChatScreen {
  const name = params.fundamentals.name.trim() || params.ticker;
  const currency = params.fundamentals.currency || 'USD';
  const isIndex = isMarketIndexTicker(params.ticker);
  const subjectLabel = isIndex ? 'market index' : 'company';
  const latestLabel = isIndex ? 'Latest level' : 'Latest price';
  const promptText = [
    `OPEN PAGE SNAPSHOT — the chart and fundamentals for one ${subjectLabel} in Krepton.`,
    'Background only. Use these figures only if the user asked about this chart.',
    'Do not tell the user to buy, sell, or size a trade.',
    isIndex
      ? 'The figures below are Krepton index levels (points, not currency). Bar cards use the same period return.'
      : 'The figures below are Krepton data. Bar cards use the same period return, P/E, revenue growth, and profit margin.',
    'Do not invent different values. Do not describe a zoom level or a drawing that is not listed here.',
    `Period: ${params.periodLabel}.`,
    `${params.ticker} (${name}): start ${formatChartPoint(params.ticker, currency, params.startPrice)}, end ${formatChartPoint(params.ticker, currency, params.endPrice)}, return ${formatSignedPercent(params.returnPercent)}.`,
    `${latestLabel} ${formatPrice(params.fundamentals)}.`,
    isIndex
      ? 'Equity fundamentals such as P/E do not apply to this index.'
      : `P/E ${formatMultiple(metricValue(params.fundamentals, 'peRatio'))}, revenue growth ${formatPercent(metricValue(params.fundamentals, 'revenueGrowth'))}, profit margin ${formatPercent(metricValue(params.fundamentals, 'profitMargin'))}.`,
  ].join('\n');

  const referencePrices = [params.startPrice, params.endPrice, params.fundamentals.price].filter(
    (price): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0
  );

  const periodReturnBlock: TickerChatDisplayBlock = {
    kind: 'backtest-bars',
    title: params.periodLabel,
    rows: [{ label: params.ticker, returnPercent: params.returnPercent }],
  };
  const fundamentalBlocks: TickerChatDisplayBlock[] = isIndex
    ? []
    : TICKER_CHAT_COMPARE_BAR_METRICS.map((metric) => ({
        kind: 'compare-bars' as const,
        metricKey: metric.key,
        title: metric.title,
        unit: metric.unit,
        rows: [
          {
            ticker: params.ticker,
            name,
            value: metricValue(params.fundamentals, metric.key),
          },
        ],
      }));

  return {
    promptText,
    displayBlocks: [periodReturnBlock, ...fundamentalBlocks],
    referencePrices,
  };
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function buildTickerChatRebalancingScreen(
  analysis: RebalancingAnalysisResponse
): ResolvedTickerChatScreen {
  const rows: TickerChatAllocationBarRow[] =
    analysis.deviations.length > 0
      ? analysis.deviations.map((item) => ({
          label: item.label,
          currentPercent: item.currentPercent,
          targetPercent: item.targetPercent,
        }))
      : analysis.targetAllocations.map((item) => ({
          label: item.label,
          currentPercent: 0,
          targetPercent: item.weightPercent,
        }));

  const driftLines =
    analysis.deviations.length > 0
      ? analysis.deviations.map(
          (item) =>
            `- ${item.label}: current ${item.currentPercent.toFixed(1)}%, target ${item.targetPercent.toFixed(1)}%, deviation ${formatSignedPercent(item.deviationPercent)} (${item.status}).`
        )
      : rows.map(
          (item) => `- ${item.label}: no current holding, target ${item.targetPercent.toFixed(1)}%.`
        );

  const mappingLines = analysis.tickerMappings
    .slice(0, TICKER_CHAT_REBALANCING_MAX_MAPPINGS)
    .map((item) => `- ${item.ticker} → ${item.bucketLabel}`);

  const promptText = [
    'OPEN PAGE SNAPSHOT — the Krepton rebalancing calculator.',
    'The target mix was selected by the user. Explain the percentage drift.',
    'Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton data. The chat draws the same current and target bars.',
    'Do not invent different values.',
    `Strategy: ${analysis.strategyName}.`,
    `Alignment score: ${analysis.alignmentScore}.`,
    `Portfolio value: ${analysis.displayCurrency} ${analysis.totalPortfolioValue.toFixed(2)}.`,
    ...driftLines,
    ...(mappingLines.length > 0 ? ['Ticker buckets:', ...mappingLines] : []),
  ].join('\n');

  return {
    promptText,
    displayBlocks: [
      {
        kind: 'allocation-bars',
        title: analysis.strategyName,
        rows,
      },
    ],
    referencePrices: [],
  };
}

function moverLines(title: string, items: MarketMoverItem[]): string[] {
  return [
    title,
    ...items.map(
      (item) =>
        `- ${item.ticker} (${item.name.trim() || item.ticker}): ${item.currency} ${item.price.toFixed(2)}, ${formatSignedPercent(item.changePercent)}.`
    ),
  ];
}

function moverBlock(
  title: string,
  side: 'gainers' | 'losers',
  items: MarketMoverItem[]
): TickerChatDisplayBlock {
  return {
    kind: 'mover-bars',
    title,
    side,
    rows: items.map((item) => ({
      ticker: item.ticker,
      name: item.name.trim() || item.ticker,
      changePercent: item.changePercent,
    })),
  };
}

export function buildTickerChatMoversScreen(
  gainers: MarketMoverItem[],
  losers: MarketMoverItem[]
): ResolvedTickerChatScreen {
  const promptText = [
    'OPEN PAGE SNAPSHOT — US day gainers and losers shown in Krepton.',
    'Background only. Use these figures only if the user asked about these movers.',
    'Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton data. Bar cards use the same day change.',
    'Do not invent different values.',
    ...moverLines('Gainers:', gainers),
    ...moverLines('Losers:', losers),
  ].join('\n');

  return {
    promptText,
    displayBlocks: [
      moverBlock('Top gainers', 'gainers', gainers),
      moverBlock('Top losers', 'losers', losers),
    ],
    referencePrices: [...gainers, ...losers]
      .map((item) => readFiniteNumber(item.price))
      .filter((price): price is number => price !== null && price > 0),
  };
}

export function buildTickerChatBacktestScreen(
  result: StockBacktestResponse
): ResolvedTickerChatScreen {
  const holdingLines = result.holdings.map(
    (holding) =>
      `- ${holding.ticker} (${holding.name.trim() || holding.ticker}): weight ${holding.weightPercent.toFixed(1)}%, return ${formatSignedPercent(holding.returnPercent)}.`
  );
  const breakdownLines = result.periodBreakdown.map(
    (period) =>
      `- ${period.label}: portfolio ${formatSignedPercent(period.portfolioReturnPercent)}, ${result.benchmark.label} ${formatSignedPercent(period.benchmarkReturnPercent)}.`
  );

  const promptText = [
    'OPEN PAGE SNAPSHOT — a backtest the user calculated in Krepton.',
    'Explain the result. Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton data. The bar card uses the same returns.',
    'Do not invent different values.',
    `Starting amount: ${result.displayCurrency} ${result.amount.toFixed(2)}.`,
    `Period: ${result.periodLabel}.`,
    `Portfolio: ${formatSignedPercent(result.portfolio.returnPercent)}, final value ${result.portfolio.currency} ${result.portfolio.finalValue.toFixed(2)}.`,
    `${result.benchmark.label}: ${formatSignedPercent(result.benchmark.returnPercent)}, final value ${result.benchmark.currency} ${result.benchmark.finalValue.toFixed(2)}.`,
    'Holdings:',
    ...holdingLines,
    'Other periods:',
    ...breakdownLines,
  ].join('\n');

  return {
    promptText,
    displayBlocks: [
      {
        kind: 'backtest-bars',
        title: result.periodLabel,
        rows: [
          { label: 'Portfolio', returnPercent: result.portfolio.returnPercent },
          { label: result.benchmark.label, returnPercent: result.benchmark.returnPercent },
          ...result.holdings.map((holding) => ({
            label: holding.ticker,
            returnPercent: holding.returnPercent,
          })),
        ],
      },
    ],
    referencePrices: [],
  };
}

async function resolveBacktestScreen(rawScreenContext: object): Promise<ResolvedTickerChatScreen> {
  const periodValue = (rawScreenContext as { period?: unknown }).period;
  if (typeof periodValue !== 'string' || !isBacktestPeriod(periodValue)) {
    throw new AppError(400, 'Invalid backtest period. Valid: 1y, 3y, 5y, 10y');
  }

  const rawAmount = (rawScreenContext as { amount?: unknown }).amount;
  if (
    typeof rawAmount !== 'number' ||
    !Number.isFinite(rawAmount) ||
    rawAmount < BACKTEST_MIN_AMOUNT ||
    rawAmount > BACKTEST_MAX_AMOUNT
  ) {
    throw new AppError(
      400,
      `Amount must be between ${BACKTEST_MIN_AMOUNT} and ${BACKTEST_MAX_AMOUNT}`
    );
  }

  const rawAllocations = (rawScreenContext as { allocations?: unknown }).allocations;
  if (!Array.isArray(rawAllocations)) {
    throw new AppError(400, 'screenContext allocations must be an array');
  }

  if (
    rawAllocations.length < BACKTEST_MIN_TICKERS ||
    rawAllocations.length > BACKTEST_MAX_TICKERS
  ) {
    throw new AppError(
      400,
      `Backtest needs ${BACKTEST_MIN_TICKERS} to ${BACKTEST_MAX_TICKERS} tickers`
    );
  }

  const allocations: Array<{ ticker: string; weightPercent: number }> = [];
  for (const rawAllocation of rawAllocations) {
    if (!rawAllocation || typeof rawAllocation !== 'object') {
      throw new AppError(400, 'Each backtest allocation must be an object');
    }

    const rawTicker = (rawAllocation as { ticker?: unknown }).ticker;
    const weightPercent = (rawAllocation as { weightPercent?: unknown }).weightPercent;
    if (typeof rawTicker !== 'string') {
      throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
    }

    if (
      typeof weightPercent !== 'number' ||
      !Number.isFinite(weightPercent) ||
      weightPercent <= 0
    ) {
      throw new AppError(400, 'Each allocation weight must be greater than 0');
    }

    let ticker: string;
    try {
      ticker = assertValidTickerSymbol(rawTicker);
    } catch {
      throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
    }

    if (allocations.some((allocation) => allocation.ticker === ticker)) {
      throw new AppError(400, 'Duplicate tickers are not allowed');
    }

    allocations.push({ ticker, weightPercent });
  }

  const totalWeight = allocations.reduce((sum, allocation) => sum + allocation.weightPercent, 0);
  if (Math.abs(totalWeight - BACKTEST_ALLOCATION_TOTAL_PERCENT) > BACKTEST_ALLOCATION_TOLERANCE) {
    throw new AppError(400, 'Allocation weights must sum to 100%');
  }

  const displayCurrency = parseDisplayCurrency(
    (rawScreenContext as { displayCurrency?: unknown }).displayCurrency
  );
  const backtest = await runStockBacktest({
    allocations,
    period: periodValue,
    amount: rawAmount,
    displayCurrency,
  });
  return buildTickerChatBacktestScreen(backtest);
}

interface PortfolioWeightInput {
  ticker: string;
  name: string;
  sector: string | null;
  marketValue: number;
}

function roundWeightPercent(value: number): number {
  return Math.round(value * TICKER_CHAT_WEIGHT_PERCENT_SCALE) / TICKER_CHAT_WEIGHT_PERCENT_SCALE;
}

function assignWeightPercents(
  inputs: PortfolioWeightInput[]
): Array<PortfolioWeightInput & { weightPercent: number }> {
  const totalValue = inputs.reduce((sum, item) => sum + item.marketValue, 0);
  if (!(totalValue > 0)) {
    return [];
  }

  const weighted = inputs.map((item) => ({
    ...item,
    weightPercent: roundWeightPercent((item.marketValue / totalValue) * 100),
  }));
  const roundedTotal = weighted.reduce((sum, item) => sum + item.weightPercent, 0);
  const delta = roundWeightPercent(100 - roundedTotal);
  if (weighted.length > 0 && delta !== 0) {
    weighted[0] = {
      ...weighted[0],
      weightPercent: roundWeightPercent(weighted[0].weightPercent + delta),
    };
  }

  return weighted;
}

export function buildTickerChatPortfolioScreen(
  displayCurrency: string,
  holdings: PortfolioWeightInput[]
): ResolvedTickerChatScreen {
  const largestFirst = [...holdings].sort((left, right) => right.marketValue - left.marketValue);
  const weightedHoldings = assignWeightPercents(largestFirst);
  const visibleHoldings = weightedHoldings.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS);
  const omittedCount = weightedHoldings.length - visibleHoldings.length;
  const holdingLines =
    visibleHoldings.length === 0
      ? ['- None.']
      : visibleHoldings.map((holding) => {
          const sector = holding.sector?.trim() || 'sector unknown';
          return `- ${holding.ticker} (${holding.name.trim() || holding.ticker}), ${sector}: ${holding.weightPercent.toFixed(1)}%.`;
        });

  const promptText = [
    'OPEN PAGE SNAPSHOT — portfolio weights in Krepton.',
    'Explain how the market value is spread. Do not tell the user to buy, sell, or size a trade.',
    'The figures below are weights only. Share counts and average buy prices are not included.',
    'Do not invent different weights.',
    `Currency used to value the portfolio: ${displayCurrency}.`,
    omittedCount > 0 ? `Smaller holdings not listed: ${omittedCount}.` : 'All holdings are listed.',
    'Weights:',
    ...holdingLines,
  ].join('\n');

  return {
    promptText,
    displayBlocks:
      visibleHoldings.length === 0
        ? []
        : [
            {
              kind: 'weight-bars',
              title: 'Portfolio weights',
              rows: visibleHoldings.map((holding) => ({
                label: holding.ticker,
                weightPercent: holding.weightPercent,
              })),
            },
          ],
    referencePrices: [],
  };
}

export function buildTickerChatNewsScreen(items: PortfolioNewsItem[]): ResolvedTickerChatScreen {
  const headlines = items.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS).map((item) => ({
    ticker: item.tickers[0] ?? '',
    headline: item.headline.trim().slice(0, TICKER_CHAT_SCREEN_HEADLINE_MAX_CHARS),
    source: item.source.trim() || 'Unknown source',
  }));
  const visibleHeadlines = headlines.filter((item) => item.ticker && item.headline);
  const headlineLines =
    visibleHeadlines.length === 0
      ? ['- None.']
      : visibleHeadlines.map((item) => `- ${item.ticker}: ${item.headline} (${item.source}).`);

  const promptText = [
    'OPEN PAGE SNAPSHOT — headlines for this portfolio in Krepton.',
    'Background only. Use these headlines only if the user asked about this page.',
    'Do not tell the user to buy, sell, or size a trade.',
    'Do not invent headlines, and do not add links.',
    'Headlines:',
    ...headlineLines,
  ].join('\n');

  return {
    promptText,
    displayBlocks:
      visibleHeadlines.length === 0
        ? []
        : [
            {
              kind: 'headline-list',
              title: 'Headlines',
              rows: visibleHeadlines.map((item) => ({
                ticker: item.ticker,
                headline: item.headline,
              })),
            },
          ],
    referencePrices: [],
  };
}

export function buildTickerChatWatchlistScreen(
  items: Array<{ ticker: string; name: string; price: number; changePercent: number }>
): ResolvedTickerChatScreen {
  const visibleItems = items.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS);
  const itemLines =
    visibleItems.length === 0
      ? ['- None.']
      : visibleItems.map((item) => {
          const name = item.name.trim() || item.ticker;
          return `- ${item.ticker} (${name}): price ${item.price.toFixed(2)}, day ${formatSignedPercent(item.changePercent)}.`;
        });

  const promptText = [
    'OPEN PAGE SNAPSHOT — the watchlist in Krepton.',
    'Background only. Use these figures only if the user asked about this watchlist.',
    'Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton quotes. The bar card uses the same day change.',
    'Do not invent different prices.',
    'Watchlist:',
    ...itemLines,
  ].join('\n');

  return {
    promptText,
    displayBlocks:
      visibleItems.length === 0
        ? []
        : [
            {
              kind: 'backtest-bars',
              title: 'Day change',
              rows: visibleItems.map((item) => ({
                label: item.ticker,
                returnPercent: item.changePercent,
              })),
            },
          ],
    referencePrices: visibleItems
      .map((item) => item.price)
      .filter((price) => Number.isFinite(price) && price > 0),
  };
}

async function marketValueInDisplayCurrency(
  shares: number,
  quote: StockQuote,
  displayCurrency: ReturnType<typeof parseDisplayCurrency>,
  lookup: Map<string, number>
): Promise<number | null> {
  if (!(shares > 0) || !(quote.price > 0)) {
    return null;
  }

  const nativeValue = shares * quote.price;
  const sourceCurrency = quote.currency || displayCurrency;
  if (sourceCurrency === displayCurrency) {
    return nativeValue;
  }

  const converted = await convertAmountForDisplay(
    nativeValue,
    sourceCurrency,
    getTodayIsoDate(),
    displayCurrency,
    lookup
  );
  return converted.displayAmount > 0 ? converted.displayAmount : null;
}

async function resolvePortfolioScreen(
  userId: string,
  rawScreenContext: object
): Promise<ResolvedTickerChatScreen> {
  const displayCurrency = parseDisplayCurrency(
    (rawScreenContext as { displayCurrency?: unknown }).displayCurrency
  );
  const positions = await getUserPositions(userId, displayCurrency);
  const quotes = await getCachedStockQuotes(positions.map((position) => position.ticker));
  const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));
  const lookup = new Map<string, number>();
  const holdings: PortfolioWeightInput[] = [];

  for (const position of positions) {
    if (position.includedInAnalysis === false) {
      continue;
    }

    const quote = quoteByTicker.get(position.ticker);
    if (!quote) {
      continue;
    }

    const marketValue = await marketValueInDisplayCurrency(
      position.shares,
      quote,
      displayCurrency,
      lookup
    );
    if (marketValue === null) {
      continue;
    }

    holdings.push({
      ticker: position.ticker,
      name: position.companyName,
      sector: position.sector,
      marketValue,
    });
  }

  return buildTickerChatPortfolioScreen(displayCurrency, holdings);
}

async function resolveNewsScreen(userId: string): Promise<ResolvedTickerChatScreen> {
  const headlines = await getUserPortfolioNews(userId);
  return buildTickerChatNewsScreen(headlines);
}

async function resolveWatchlistScreen(userId: string): Promise<ResolvedTickerChatScreen> {
  const watchlist = await getUserWatchlist(userId);
  const quotes = await getCachedStockQuotes(watchlist.map((item) => item.ticker));
  const quoteByTicker = new Map(quotes.map((quote) => [quote.ticker, quote]));
  const items = watchlist.flatMap((item) => {
    const quote = quoteByTicker.get(item.ticker);
    if (!quote || !(quote.price > 0) || !Number.isFinite(quote.changePercent)) {
      return [];
    }

    return [
      {
        ticker: item.ticker,
        name: item.companyName,
        price: quote.price,
        changePercent: quote.changePercent,
      },
    ];
  });

  return buildTickerChatWatchlistScreen(items);
}

async function resolveDividendScreen(
  userId: string,
  rawScreenContext: object
): Promise<ResolvedTickerChatScreen> {
  const displayCurrency = parseDisplayCurrency(
    (rawScreenContext as { displayCurrency?: unknown }).displayCurrency
  );
  const calendar = await getUserPortfolioDividendCalendar(userId, displayCurrency);
  return buildTickerChatDividendScreen(calendar);
}

type TickerChatPairTopic = (typeof TICKER_CHAT_PAIR_TOPICS)[number];

interface TickerChatPairPathRow {
  ticker: string;
  name: string;
  currency: string;
  startPrice: number;
  endPrice: number;
  highPrice: number;
  lowPrice: number;
  returnPercent: number;
  livePrice: number | null;
}

function isTickerChatPairTopic(value: string): value is TickerChatPairTopic {
  return (TICKER_CHAT_PAIR_TOPICS as readonly string[]).includes(value);
}

export function buildTickerChatPairPathScreen(params: {
  topic: 'returns' | 'paths';
  periodLabel: string;
  rows: TickerChatPairPathRow[];
}): ResolvedTickerChatScreen {
  const lines = params.rows.map((row) => {
    const name = row.name.trim() || row.ticker;
    return `- ${row.ticker} (${name}): ${formatMoney(row.currency, row.startPrice)} to ${formatMoney(row.currency, row.endPrice)}, high ${formatMoney(row.currency, row.highPrice)}, low ${formatMoney(row.currency, row.lowPrice)}, return ${formatSignedPercent(row.returnPercent)}.`;
  });
  const pathNote =
    params.topic === 'paths'
      ? 'Describe how each price path is shaped. Wyckoff words such as accumulation, markup, distribution, and markdown may describe that shape only. Do not treat a phase as a buy or sell signal.'
      : 'Explain the two returns. The bar card uses the same percentages.';

  const promptText = [
    `OPEN PAGE SNAPSHOT — ${params.periodLabel} prices for two tickers in Krepton.`,
    'Background only. Use these figures only if the user asked about this pair.',
    'Do not tell the user to buy, sell, or size a trade.',
    'The figures below are Krepton closes. Do not invent different prices or returns.',
    pathNote,
    `Period: ${params.periodLabel}.`,
    ...lines,
  ].join('\n');

  const referencePrices = params.rows.flatMap((row) =>
    [row.startPrice, row.endPrice, row.highPrice, row.lowPrice, row.livePrice ?? 0].filter(
      (price) => price > 0
    )
  );

  return {
    promptText,
    displayBlocks: [
      {
        kind: 'backtest-bars',
        title: params.periodLabel,
        rows: params.rows.map((row) => ({
          label: row.ticker,
          returnPercent: row.returnPercent,
        })),
      },
    ],
    referencePrices,
  };
}

function candleRange(candles: OhlcvCandle[]): { highPrice: number; lowPrice: number } | null {
  const highs = candles
    .map((candle) => candle.high)
    .filter((price) => typeof price === 'number' && Number.isFinite(price));
  const lows = candles
    .map((candle) => candle.low)
    .filter((price) => typeof price === 'number' && Number.isFinite(price));
  if (highs.length === 0 || lows.length === 0) {
    return null;
  }

  return { highPrice: Math.max(...highs), lowPrice: Math.min(...lows) };
}

async function resolvePairScreen(
  focusTicker: string,
  rawScreenContext: object
): Promise<ResolvedTickerChatScreen> {
  const rawTopic = (rawScreenContext as { topic?: unknown }).topic;
  const periodValue = (rawScreenContext as { period?: unknown }).period;
  const rawOtherTicker = (rawScreenContext as { otherTicker?: unknown }).otherTicker;
  if (typeof rawTopic !== 'string' || !isTickerChatPairTopic(rawTopic)) {
    throw new AppError(400, `Invalid pair topic. Valid: ${TICKER_CHAT_PAIR_TOPICS.join(', ')}`);
  }
  if (typeof periodValue !== 'string' || !isTickerChatChartPeriod(periodValue)) {
    throw new AppError(400, `Invalid chart period. Valid: ${TICKER_CHAT_CHART_PERIODS.join(', ')}`);
  }
  if (typeof rawOtherTicker !== 'string') {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }

  let focus: string;
  let other: string;
  try {
    focus = assertValidTickerSymbol(focusTicker);
    other = assertValidTickerSymbol(rawOtherTicker);
  } catch {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }
  if (other === focus) {
    throw new AppError(400, 'The other ticker must be different');
  }

  if (rawTopic === 'metrics') {
    try {
      const comparison = await getStockCompare([focus, other]);
      return buildTickerChatCompareScreen(comparison.items);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'No fundamentals for these tickers');
    }
  }

  try {
    const [focusHistory, otherHistory, focusFundamentals, otherFundamentals] = await Promise.all([
      getStockHistory(focus, periodValue, TICKER_CHAT_CHART_INTERVAL),
      getStockHistory(other, periodValue, TICKER_CHAT_CHART_INTERVAL),
      getStockFundamentals(focus),
      getStockFundamentals(other),
    ]);
    const focusReturn = periodReturnFromCandles(focusHistory.candles);
    const otherReturn = periodReturnFromCandles(otherHistory.candles);
    const focusRange = candleRange(focusHistory.candles);
    const otherRange = candleRange(otherHistory.candles);
    if (!focusReturn || !otherReturn || !focusRange || !otherRange) {
      throw new AppError(400, 'No chart data for this period');
    }

    return buildTickerChatPairPathScreen({
      topic: rawTopic,
      periodLabel: TICKER_CHAT_CHART_PERIOD_LABELS[periodValue],
      rows: [
        {
          ticker: focus,
          name: focusFundamentals.name,
          currency: focusFundamentals.currency,
          ...focusReturn,
          ...focusRange,
          livePrice: readFiniteNumber(focusFundamentals.price),
        },
        {
          ticker: other,
          name: otherFundamentals.name,
          currency: otherFundamentals.currency,
          ...otherReturn,
          ...otherRange,
          livePrice: readFiniteNumber(otherFundamentals.price),
        },
      ],
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, 'No chart data for this period');
  }
}

async function resolveTickerScreen(
  focusTicker: string,
  rawScreenContext: object
): Promise<ResolvedTickerChatScreen> {
  const periodValue = (rawScreenContext as { period?: unknown }).period;
  if (typeof periodValue !== 'string' || !isTickerChatChartPeriod(periodValue)) {
    throw new AppError(400, `Invalid chart period. Valid: ${TICKER_CHAT_CHART_PERIODS.join(', ')}`);
  }

  let ticker: string;
  try {
    ticker = assertValidTickerSymbol(focusTicker);
  } catch {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }

  let fundamentals: StockCompareItem;
  try {
    fundamentals = await getStockFundamentals(ticker);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, 'No fundamentals for this ticker');
  }

  let candles: OhlcvCandle[];
  try {
    const history = await getStockHistory(ticker, periodValue, TICKER_CHAT_CHART_INTERVAL);
    candles = history.candles;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, 'No chart data for this period');
  }

  const periodReturn = periodReturnFromCandles(candles);
  if (!periodReturn) {
    throw new AppError(400, 'No chart data for this period');
  }

  return buildTickerChatTickerScreen({
    ticker,
    periodLabel: TICKER_CHAT_CHART_PERIOD_LABELS[periodValue],
    fundamentals,
    ...periodReturn,
  });
}

async function resolveCompareScreen(rawTickers: unknown): Promise<ResolvedTickerChatScreen> {
  if (!Array.isArray(rawTickers)) {
    throw new AppError(400, 'screenContext tickers must be an array');
  }

  const tickers: string[] = [];
  for (const rawTicker of rawTickers) {
    if (typeof rawTicker !== 'string') {
      throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
    }

    try {
      const ticker = assertValidTickerSymbol(rawTicker);
      if (!tickers.includes(ticker)) {
        tickers.push(ticker);
      }
    } catch {
      throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
    }
  }

  if (tickers.length < STOCK_COMPARE_MIN_TICKERS || tickers.length > STOCK_COMPARE_MAX_TICKERS) {
    throw new AppError(
      400,
      `screenContext needs ${STOCK_COMPARE_MIN_TICKERS} to ${STOCK_COMPARE_MAX_TICKERS} tickers`
    );
  }

  const comparison = await getStockCompare(tickers);
  return buildTickerChatCompareScreen(comparison.items);
}

export async function resolveTickerChatScreenContext(
  userId: string,
  rawScreenContext: unknown,
  focusTicker: string
): Promise<ResolvedTickerChatScreen | null> {
  if (rawScreenContext === undefined || rawScreenContext === null) {
    return null;
  }

  if (typeof rawScreenContext !== 'object' || Array.isArray(rawScreenContext)) {
    throw new AppError(400, 'screenContext must be an object');
  }

  const kind = (rawScreenContext as { kind?: unknown }).kind;
  if (kind === 'compare') {
    return resolveCompareScreen((rawScreenContext as { tickers?: unknown }).tickers);
  }

  if (kind === 'rebalancing') {
    const displayCurrency = parseDisplayCurrency(
      (rawScreenContext as { displayCurrency?: unknown }).displayCurrency
    );
    const analysis = await getUserPortfolioRebalancingAnalysis(userId, displayCurrency);
    return buildTickerChatRebalancingScreen(analysis);
  }

  if (kind === 'movers') {
    const movers = await getMarketMovers();
    return buildTickerChatMoversScreen(movers.gainers, movers.losers);
  }

  if (kind === 'backtest') {
    return resolveBacktestScreen(rawScreenContext);
  }

  if (kind === 'dividends') {
    return resolveDividendScreen(userId, rawScreenContext);
  }

  if (kind === 'ticker' || kind === 'pair') {
    if (!focusTicker) {
      throw new AppError(400, 'screenContext needs the open ticker');
    }
  }

  if (kind === 'ticker') {
    return resolveTickerScreen(focusTicker, rawScreenContext);
  }

  if (kind === 'pair') {
    return resolvePairScreen(focusTicker, rawScreenContext);
  }

  if (kind === 'portfolio') {
    return resolvePortfolioScreen(userId, rawScreenContext);
  }

  if (kind === 'news') {
    return resolveNewsScreen(userId);
  }

  if (kind === 'watchlist') {
    return resolveWatchlistScreen(userId);
  }

  throw new AppError(400, 'screenContext kind is not supported');
}
