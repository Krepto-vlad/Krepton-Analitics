import {
  OUTSIDE_PORTFOLIO_ANALYSIS_PAIR_SUFFIXES,
  OUTSIDE_PORTFOLIO_ANALYSIS_QUOTE_TYPES,
} from '../constants.js';
import { getCachedStockQuotes } from './quoteCacheService.js';

const OUTSIDE_QUOTE_TYPES = new Set<string>(OUTSIDE_PORTFOLIO_ANALYSIS_QUOTE_TYPES);
const CRYPTO_PAIR_SUFFIXES = new Set<string>(OUTSIDE_PORTFOLIO_ANALYSIS_PAIR_SUFFIXES);

const FUTURE_TICKER_PATTERN = /=F$/;
const FOREX_TICKER_PATTERN = /=X$/;
const INDEX_TICKER_PATTERN = /^\^/;

/**
 * True when this holding must stay out of portfolio value, sector mix, rebalancing, and AI.
 * A known Yahoo type wins. Without a type, futures, forex, indexes, and crypto pairs still stay out.
 */
export function isTickerOutsideAnalysis(ticker: string, quoteType: string | null): boolean {
  const normalizedType = quoteType?.trim().toUpperCase() ?? '';
  if (normalizedType) {
    return OUTSIDE_QUOTE_TYPES.has(normalizedType);
  }

  const upperTicker = ticker.trim().toUpperCase();
  if (
    FUTURE_TICKER_PATTERN.test(upperTicker) ||
    FOREX_TICKER_PATTERN.test(upperTicker) ||
    INDEX_TICKER_PATTERN.test(upperTicker)
  ) {
    return true;
  }

  const pairSeparator = upperTicker.lastIndexOf('-');
  if (pairSeparator <= 0) {
    return false;
  }

  const pairSuffix = upperTicker.slice(pairSeparator + 1);
  return CRYPTO_PAIR_SUFFIXES.has(pairSuffix);
}

export async function findTickersOutsideAnalysis(tickers: readonly string[]): Promise<Set<string>> {
  const uniqueTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()))].filter(
    Boolean
  );
  if (uniqueTickers.length === 0) {
    return new Set();
  }

  const quotes = await getCachedStockQuotes(uniqueTickers);
  const quoteTypeByTicker = new Map(
    quotes.map((quote) => [quote.ticker.toUpperCase(), quote.quoteType])
  );
  const outsideTickers = new Set<string>();

  for (const ticker of uniqueTickers) {
    const quoteType = quoteTypeByTicker.get(ticker) ?? null;
    if (isTickerOutsideAnalysis(ticker, quoteType)) {
      outsideTickers.add(ticker);
    }
  }

  return outsideTickers;
}
