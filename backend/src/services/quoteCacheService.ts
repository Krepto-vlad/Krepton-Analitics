import YahooFinance from 'yahoo-finance2';
import type { StockQuote } from '../types/stock.types.js';
import {
  YAHOO_QUOTE_CACHE_TTL_MS,
  YAHOO_QUOTE_BATCH_MAX_SIZE,
  YAHOO_EXTERNAL_CALLS_BUDGET_PER_MINUTE,
  YAHOO_QUOTE_MIN_FETCH_GAP_MS,
} from '../constants.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface CacheEntry {
  quote: StockQuote;
  expiresAt: number;
}

interface YahooFinanceQuoteRow {
  symbol?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  currency?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketPreviousClose?: number;
}

const quoteCache = new Map<string, CacheEntry>();
const yahooCallTimestamps: number[] = [];
const pendingRefreshTickers = new Set<string>();
let lastYahooFetchAt = 0;
let activeYahooFetch: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFallbackQuote(ticker: string): StockQuote {
  return {
    ticker,
    name: ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: null,
    currency: 'USD',
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
  };
}

function mapYahooRowToStockQuote(row: YahooFinanceQuoteRow, fallbackTicker: string): StockQuote {
  const ticker = row.symbol ?? fallbackTicker;
  const currentPrice = row.regularMarketPrice ?? 0;
  const previousClose = row.regularMarketPreviousClose ?? 0;

  const change = previousClose > 0 ? currentPrice - previousClose : (row.regularMarketChange ?? 0);
  const changePercent =
    previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : (row.regularMarketChangePercent ?? 0);

  return {
    ticker,
    name: row.longName ?? row.shortName ?? ticker,
    price: currentPrice,
    change,
    changePercent,
    volume: row.regularMarketVolume ?? 0,
    marketCap: row.marketCap ?? null,
    currency: row.currency ?? 'USD',
    fiftyTwoWeekHigh: row.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: row.fiftyTwoWeekLow ?? null,
  };
}

function pruneCallBudget(): void {
  const oneMinuteAgo = Date.now() - 60_000;
  while (yahooCallTimestamps.length > 0 && yahooCallTimestamps[0] < oneMinuteAgo) {
    yahooCallTimestamps.shift();
  }
}

function hasYahooBudget(): boolean {
  pruneCallBudget();
  return yahooCallTimestamps.length < YAHOO_EXTERNAL_CALLS_BUDGET_PER_MINUTE;
}

function recordYahooCall(): void {
  yahooCallTimestamps.push(Date.now());
}

function getMinGapWaitMs(): number {
  return Math.max(0, YAHOO_QUOTE_MIN_FETCH_GAP_MS - (Date.now() - lastYahooFetchAt));
}

function getCachedQuoteEvenIfExpired(ticker: string): StockQuote | null {
  return quoteCache.get(ticker)?.quote ?? null;
}

function chunkTickers(tickers: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < tickers.length; index += YAHOO_QUOTE_BATCH_MAX_SIZE) {
    chunks.push(tickers.slice(index, index + YAHOO_QUOTE_BATCH_MAX_SIZE));
  }
  return chunks;
}

async function fetchTickersFromYahoo(tickers: string[]): Promise<void> {
  if (tickers.length === 0) return;

  const chunks = chunkTickers(tickers);
  const now = Date.now();

  for (const chunk of chunks) {
    try {
      const rows = (await yahooFinance.quote(chunk)) as
        | YahooFinanceQuoteRow
        | YahooFinanceQuoteRow[];
      const normalizedRows = Array.isArray(rows) ? rows : [rows];
      const rowByTicker = new Map<string, YahooFinanceQuoteRow>();

      for (const row of normalizedRows) {
        if (row.symbol) {
          rowByTicker.set(row.symbol.toUpperCase(), row);
        }
      }

      for (const ticker of chunk) {
        const row = rowByTicker.get(ticker);
        const quote = row
          ? mapYahooRowToStockQuote(row, ticker)
          : (getCachedQuoteEvenIfExpired(ticker) ?? buildFallbackQuote(ticker));

        quoteCache.set(ticker, {
          quote,
          expiresAt: now + YAHOO_QUOTE_CACHE_TTL_MS,
        });
      }

      recordYahooCall();
    } catch (error) {
      console.warn('[QuoteCache] Yahoo batch fetch failed:', (error as Error).message);

      for (const ticker of chunk) {
        const staleQuote = getCachedQuoteEvenIfExpired(ticker);
        if (staleQuote) {
          quoteCache.set(ticker, {
            quote: staleQuote,
            expiresAt: now + YAHOO_QUOTE_CACHE_TTL_MS,
          });
        }
      }
    }
  }
}

async function drainPendingRefreshQueue(): Promise<void> {
  while (pendingRefreshTickers.size > 0) {
    if (!hasYahooBudget()) {
      console.warn(
        '[QuoteCache] Yahoo minute budget exhausted — serving stale quotes for remaining tickers'
      );
      return;
    }

    const minGapWaitMs = getMinGapWaitMs();
    if (minGapWaitMs > 0) {
      await sleep(minGapWaitMs);
      continue;
    }

    const batch = [...pendingRefreshTickers];
    pendingRefreshTickers.clear();
    await fetchTickersFromYahoo(batch);
    lastYahooFetchAt = Date.now();
  }
}

function startBackgroundRefreshIfNeeded(): void {
  if (pendingRefreshTickers.size === 0 || activeYahooFetch) {
    return;
  }

  activeYahooFetch = drainPendingRefreshQueue().finally(() => {
    activeYahooFetch = null;
  });
}

async function ensurePendingTickersRefreshed(): Promise<void> {
  if (pendingRefreshTickers.size === 0) {
    return;
  }

  if (!activeYahooFetch) {
    startBackgroundRefreshIfNeeded();
  }

  await activeYahooFetch;
}

function queueStaleTickerRefresh(staleTickers: string[]): void {
  if (staleTickers.length === 0) {
    return;
  }

  for (const ticker of staleTickers) {
    pendingRefreshTickers.add(ticker);
  }

  startBackgroundRefreshIfNeeded();
}

function mapTickersToQuotes(tickers: string[]): StockQuote[] {
  return tickers.map((ticker) => {
    const entry = quoteCache.get(ticker);
    return entry?.quote ?? buildFallbackQuote(ticker);
  });
}

/**
 * Returns quotes for the requested tickers using a shared server-side cache.
 * Concurrent callers coalesce into one refresh queue to respect Yahoo rate limits.
 * When warm cache data exists, stale quotes are returned immediately while refresh runs in background.
 */
export async function getCachedStockQuotes(tickers: string[]): Promise<StockQuote[]> {
  const normalized = [...new Set(tickers.map((ticker) => ticker.toUpperCase()))];
  if (normalized.length === 0) return [];

  const now = Date.now();
  const staleTickers: string[] = [];

  for (const ticker of normalized) {
    const entry = quoteCache.get(ticker);
    if (!entry || entry.expiresAt <= now) {
      staleTickers.push(ticker);
    }
  }

  if (staleTickers.length > 0) {
    const hasWarmCache = normalized.some((ticker) => quoteCache.has(ticker));
    queueStaleTickerRefresh(staleTickers);

    if (!hasWarmCache) {
      await ensurePendingTickersRefreshed();
    }
  }

  return mapTickersToQuotes(normalized);
}

export async function getCachedStockQuote(ticker: string): Promise<StockQuote> {
  const [quote] = await getCachedStockQuotes([ticker.toUpperCase()]);
  return quote;
}
