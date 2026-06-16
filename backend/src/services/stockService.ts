import axios from 'axios';
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
}

interface YahooChartQuote {
  date: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
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

  return {
    ticker: meta.symbol ?? ticker,
    name: meta.longName ?? meta.shortName ?? ticker,
    price: meta.regularMarketPrice ?? 0,
    change: meta.regularMarketChange ?? 0,
    changePercent: meta.regularMarketChangePercent ?? 0,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap ?? null,
    currency: meta.currency ?? 'USD',
  };
}

export async function getStockHistory(
  ticker: string,
  period: string,
  interval: string
): Promise<StockHistoryResponse> {
  const { data } = await yahooClient.get('/v8/finance/chart/' + ticker, {
    params: {
      interval,
      range: period,
      includePrePost: false,
      events: 'div,split',
    },
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No history found for ticker: ${ticker}`);

  const timestamps: number[] = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0] ?? {};

  const opens: (number | null)[] = ohlcv.open ?? [];
  const highs: (number | null)[] = ohlcv.high ?? [];
  const lows: (number | null)[] = ohlcv.low ?? [];
  const closes: (number | null)[] = ohlcv.close ?? [];
  const volumes: (number | null)[] = ohlcv.volume ?? [];

  const candles: OhlcvCandle[] = timestamps
    .map(
      (timestamp, index): YahooChartQuote => ({
        date: timestamp,
        open: opens[index] ?? null,
        high: highs[index] ?? null,
        low: lows[index] ?? null,
        close: closes[index] ?? null,
        volume: volumes[index] ?? null,
      })
    )
    .filter(
      (
        quote
      ): quote is YahooChartQuote & { open: number; high: number; low: number; close: number } =>
        quote.open !== null && quote.high !== null && quote.low !== null && quote.close !== null
    )
    .map((quote) => ({
      time: quote.date,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume ?? 0,
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
