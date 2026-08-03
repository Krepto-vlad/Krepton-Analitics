import axios from 'axios';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
import {
  StockQuote,
  OhlcvCandle,
  StockHistoryResponse,
  StockSearchResult,
  StockCompareItem,
  StockCompareResponse,
} from '../types/stock.types.js';
import { SEARCH_RESULTS_LIMIT, STOCK_COMPARE_CACHE_TTL_MS } from '../constants.js';
import { getCachedStockQuote, getCachedStockQuotes } from './quoteCacheService.js';

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';

const yahooClient = axios.create({
  baseURL: YAHOO_BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
  },
  timeout: 10000,
});

interface YahooSearchQuote {
  symbol: string;
  longname?: string;
  shortname?: string;
  exchDisp?: string;
  typeDisp?: string;
  isYahooFinance?: boolean;
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const quote = await getCachedStockQuote(ticker.toUpperCase());
  if (quote.price <= 0) {
    throw new Error(`No data found for ticker: ${ticker}`);
  }
  return quote;
}

export async function getStockQuotes(tickers: string[]): Promise<StockQuote[]> {
  return getCachedStockQuotes(tickers.map((ticker) => ticker.toUpperCase()));
}

/**
 * Converts a Yahoo Finance "range" string (e.g. '6mo', '1y') into a Date
 * representing the start of that window relative to now.
 */
function periodToStartDate(period: string): Date {
  const periodDays: Record<string, number> = {
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '3y': 1095,
    '5y': 1825,
    '10y': 3650,
  };
  const days = periodDays[period] ?? 365;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getStockHistory(
  ticker: string,
  period: string,
  interval: string
): Promise<StockHistoryResponse> {
  const period1 = periodToStartDate(period);
  const period2 = new Date();

  const rows = await yahooFinance.historical(ticker, {
    period1: period1.toISOString().slice(0, 10),
    period2: period2.toISOString().slice(0, 10),
    interval: interval as '1d' | '1wk' | '1mo',
  });

  if (!rows || rows.length === 0) {
    throw new Error(`No history found for ticker: ${ticker}`);
  }

  const candles: OhlcvCandle[] = rows
    .filter((row) => row.close != null)
    .map((row) => ({
      time: Math.floor(new Date(row.date).getTime() / 1000),
      open: row.open ?? row.close,
      high: row.high ?? row.close,
      low: row.low ?? row.close,
      close: row.close,
      volume: row.volume ?? 0,
    }));

  return { ticker, interval, candles };
}

// ─── Ticker tape ─────────────────────────────────────────────────────────────
// Strategy: fetch once on server startup, refresh in background every 24h.
// Every user request is served from in-memory cache → 0 Yahoo Finance calls per visit.

import { TICKER_TAPE_REFRESH_INTERVAL_MS } from '../constants.js';

const TICKER_TAPE_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TLT', 'GLD', 'VOO'];

function buildFallbackQuote(symbol: string): StockQuote {
  return {
    ticker: symbol,
    name: symbol,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: null,
    currency: 'USD',
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    logoUrl: null,
  };
}

// Starts as fallback data so the endpoint never returns empty
let tickerTapeData: StockQuote[] = TICKER_TAPE_SYMBOLS.map(buildFallbackQuote);

async function refreshTickerTape(): Promise<void> {
  try {
    const fresh = await getCachedStockQuotes(TICKER_TAPE_SYMBOLS);
    const successCount = fresh.filter((quote) => quote.price > 0).length;

    if (successCount > 0) {
      tickerTapeData = fresh;
      console.log(`[TickerTape] Refreshed ${successCount}/${TICKER_TAPE_SYMBOLS.length} symbols`);
    } else {
      console.warn('[TickerTape] All fetches failed — keeping previous data');
    }
  } catch (error) {
    console.warn('[TickerTape] Refresh failed — keeping previous data:', (error as Error).message);
  }
}

/**
 * Call once on server startup.
 * Fetches ticker data immediately, then schedules a background refresh every 24 h.
 * Returns the NodeJS timer so the caller can cancel it if needed (e.g. in tests).
 */
export function initializeTickerTapeScheduler(): ReturnType<typeof setInterval> {
  // Kick off first fetch without blocking startup
  refreshTickerTape().catch((err) => console.error('[TickerTape] Initial fetch failed:', err));

  return setInterval(() => {
    refreshTickerTape().catch((err) =>
      console.error('[TickerTape] Scheduled refresh failed:', err)
    );
  }, TICKER_TAPE_REFRESH_INTERVAL_MS);
}

/** Returns current in-memory cache — always instant, never calls Yahoo Finance. */
export function getTickerTapeQuotes(): StockQuote[] {
  return tickerTapeData;
}

/**
 * Returns sector and industry for a given ticker using Yahoo Finance assetProfile module.
 * Returns a fallback { sector: 'Other', industry: '' } when the data is unavailable
 * (e.g. ETFs, indices, or Yahoo API hiccups) — never throws.
 */
/**
 * Returns sector and industry for a given ticker using yahoo-finance2 which
 * handles Yahoo Finance auth (crumb + cookies) automatically.
 * Falls back to { sector: 'Other', industry: '' } for ETFs / indices / errors.
 */
export async function getStockSector(
  ticker: string
): Promise<{ sector: string; industry: string }> {
  try {
    const result = (await yahooFinance.quoteSummary(ticker, {
      modules: ['assetProfile'],
    })) as { assetProfile?: { sector?: string; industry?: string } };

    const profile = result.assetProfile;
    const sector = typeof profile?.sector === 'string' && profile.sector ? profile.sector : 'Other';
    const industry = typeof profile?.industry === 'string' ? profile.industry : '';

    console.log(`[Sector] ${ticker} → ${sector} / ${industry}`);
    return { sector, industry };
  } catch (err) {
    console.warn(`[Sector] ${ticker} fetch failed — fallback "Other":`, (err as Error).message);
    return { sector: 'Other', industry: '' };
  }
}

interface YahooCompareSummary {
  assetProfile?: { sector?: string; industry?: string };
  summaryDetail?: {
    trailingPE?: number;
    forwardPE?: number;
    pegRatio?: number;
    dividendYield?: number;
    payoutRatio?: number;
    marketCap?: number;
    enterpriseValue?: number;
    priceToBook?: number;
    priceToSalesTrailing12Months?: number;
    enterpriseToEbitda?: number;
    beta?: number;
    profitMargins?: number;
    operatingMargins?: number;
  };
  financialData?: {
    returnOnEquity?: number;
    returnOnAssets?: number;
    profitMargins?: number;
    operatingMargins?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    debtToEquity?: number;
    currentRatio?: number;
    currentPrice?: number;
  };
  defaultKeyStatistics?: {
    trailingPE?: number;
    forwardPE?: number;
    pegRatio?: number;
    priceToBook?: number;
    priceToSalesTrailing12Months?: number;
    enterpriseToEbitda?: number;
    enterpriseValue?: number;
    trailingEps?: number;
    beta?: number;
    profitMargins?: number;
    payoutRatio?: number;
  };
}

const stockCompareCache = new Map<string, { item: StockCompareItem; expiresAt: number }>();

function toPercentValue(...values: Array<number | undefined | null>): number | null {
  for (const value of values) {
    if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
      continue;
    }
    const normalized = Math.abs(value) <= 1 ? value * 100 : value;
    return normalized;
  }
  return null;
}

function pickFirstPositiveNumber(...values: Array<number | undefined | null>): number | null {
  for (const value of values) {
    if (value != null && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

function pickFirstFiniteNumber(...values: Array<number | undefined | null>): number | null {
  for (const value of values) {
    if (value != null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

async function fetchStockCompareItem(ticker: string): Promise<StockCompareItem> {
  const upperTicker = ticker.toUpperCase();
  const cached = stockCompareCache.get(upperTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.item;
  }

  const [quote, summaryResult] = await Promise.all([
    getCachedStockQuote(upperTicker).catch(() => null),
    yahooFinance
      .quoteSummary(upperTicker, {
        modules: ['assetProfile', 'summaryDetail', 'financialData', 'defaultKeyStatistics'],
      })
      .catch(() => null),
  ]);

  const summary = (summaryResult ?? {}) as YahooCompareSummary;
  const profile = summary.assetProfile;
  const summaryDetail = summary.summaryDetail;
  const financialData = summary.financialData;
  const keyStats = summary.defaultKeyStatistics;

  const item: StockCompareItem = {
    ticker: upperTicker,
    name: quote?.name ?? upperTicker,
    currency: quote?.currency ?? 'USD',
    price: quote?.price ?? financialData?.currentPrice ?? null,
    sector: profile?.sector ?? null,
    industry: profile?.industry ?? null,
    marketCap: quote?.marketCap ?? summaryDetail?.marketCap ?? null,
    enterpriseValue: pickFirstPositiveNumber(
      keyStats?.enterpriseValue,
      summaryDetail?.enterpriseValue
    ),
    trailingEps: pickFirstFiniteNumber(keyStats?.trailingEps),
    peRatio: pickFirstPositiveNumber(
      summaryDetail?.trailingPE,
      keyStats?.trailingPE,
      summaryDetail?.forwardPE
    ),
    forwardPeRatio: pickFirstPositiveNumber(summaryDetail?.forwardPE, keyStats?.forwardPE),
    pegRatio: pickFirstPositiveNumber(keyStats?.pegRatio, summaryDetail?.pegRatio),
    psRatio: pickFirstPositiveNumber(
      keyStats?.priceToSalesTrailing12Months,
      summaryDetail?.priceToSalesTrailing12Months
    ),
    priceToBook: pickFirstPositiveNumber(keyStats?.priceToBook, summaryDetail?.priceToBook),
    evToEbitda: pickFirstPositiveNumber(
      keyStats?.enterpriseToEbitda,
      summaryDetail?.enterpriseToEbitda
    ),
    roe: toPercentValue(financialData?.returnOnEquity),
    roa: toPercentValue(financialData?.returnOnAssets),
    profitMargin: toPercentValue(
      financialData?.profitMargins,
      keyStats?.profitMargins,
      summaryDetail?.profitMargins
    ),
    operatingMargin: toPercentValue(
      financialData?.operatingMargins,
      summaryDetail?.operatingMargins
    ),
    revenueGrowth: toPercentValue(financialData?.revenueGrowth),
    earningsGrowth: toPercentValue(financialData?.earningsGrowth),
    debtToEquity: pickFirstFiniteNumber(financialData?.debtToEquity),
    currentRatio: pickFirstPositiveNumber(financialData?.currentRatio),
    dividendYield: toPercentValue(summaryDetail?.dividendYield),
    payoutRatio: toPercentValue(keyStats?.payoutRatio, summaryDetail?.payoutRatio),
    beta: pickFirstFiniteNumber(keyStats?.beta, summaryDetail?.beta),
  };

  stockCompareCache.set(upperTicker, {
    item,
    expiresAt: Date.now() + STOCK_COMPARE_CACHE_TTL_MS,
  });

  return item;
}

export async function getStockCompare(tickers: string[]): Promise<StockCompareResponse> {
  const normalizedTickers = [...new Set(tickers.map((ticker) => ticker.toUpperCase()))];
  const items = await Promise.all(normalizedTickers.map((ticker) => fetchStockCompareItem(ticker)));

  return {
    tickers: normalizedTickers,
    items,
  };
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const { data } = await yahooClient.get('/v1/finance/search', {
    params: {
      q: query,
      quotesCount: SEARCH_RESULTS_LIMIT,
      newsCount: 0,
      listsCount: 0,
    },
  });

  const quotes: YahooSearchQuote[] = data?.quotes ?? [];

  return quotes
    .filter((item) => item.isYahooFinance !== false && item.symbol)
    .slice(0, SEARCH_RESULTS_LIMIT)
    .map((item) => ({
      ticker: item.symbol,
      name: item.longname ?? item.shortname ?? item.symbol,
      exchange: item.exchDisp ?? '',
      type: item.typeDisp ?? '',
    }));
}
