import axios from 'axios';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
import {
  StockQuote,
  OhlcvCandle,
  StockHistoryResponse,
  StockSearchResult,
} from '../types/stock.types.js';
import { SEARCH_RESULTS_LIMIT } from '../constants.js';

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';

const yahooClient = axios.create({
  baseURL: YAHOO_BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
  },
  timeout: 10000,
});

interface YahooQuoteResult {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  currency?: string;
  chartPreviousClose?: number;
  previousClose?: number;
}

interface YahooSearchQuote {
  symbol: string;
  longname?: string;
  shortname?: string;
  exchDisp?: string;
  typeDisp?: string;
  isYahooFinance?: boolean;
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const { data } = await yahooClient.get('/v8/finance/chart/' + ticker, {
    params: { interval: '1d', range: '1d', includePrePost: false },
  });

  const meta = data?.chart?.result?.[0]?.meta as YahooQuoteResult;
  if (!meta) throw new Error(`No data found for ticker: ${ticker}`);

  const currentPrice = meta.regularMarketPrice ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;

  const change = previousClose > 0 ? currentPrice - previousClose : (meta.regularMarketChange ?? 0);
  const changePercent =
    previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : (meta.regularMarketChangePercent ?? 0);

  return {
    ticker: meta.symbol ?? ticker,
    name: meta.longName ?? meta.shortName ?? ticker,
    price: currentPrice,
    change,
    changePercent,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap ?? null,
    currency: meta.currency ?? 'USD',
  };
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
    '5y': 1825,
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
  };
}

// Starts as fallback data so the endpoint never returns empty
let tickerTapeData: StockQuote[] = TICKER_TAPE_SYMBOLS.map(buildFallbackQuote);

async function refreshTickerTape(): Promise<void> {
  const results = await Promise.allSettled(
    TICKER_TAPE_SYMBOLS.map((symbol) => getStockQuote(symbol))
  );

  const fresh: StockQuote[] = results.map((result, index) =>
    result.status === 'fulfilled' ? result.value : buildFallbackQuote(TICKER_TAPE_SYMBOLS[index])
  );

  // Only replace cache if at least one symbol fetched successfully
  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  if (successCount > 0) {
    tickerTapeData = fresh;
    console.log(`[TickerTape] Refreshed ${successCount}/${TICKER_TAPE_SYMBOLS.length} symbols`);
  } else {
    console.warn('[TickerTape] All fetches failed — keeping previous data');
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
