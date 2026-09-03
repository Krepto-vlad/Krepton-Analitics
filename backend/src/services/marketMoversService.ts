import YahooFinance from 'yahoo-finance2';
import {
  MARKET_MOVERS_CACHE_TTL_MS,
  MARKET_MOVERS_COUNT,
  MARKET_MOVERS_GAINERS_SCREENER_ID,
  MARKET_MOVERS_LOSERS_SCREENER_ID,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { MarketMoverItem, MarketMoversResponse } from '../types/stock.types.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface YahooScreenerQuote {
  symbol?: string;
  shortName?: string;
  longName?: string;
  displayName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  currency?: string;
}

interface YahooScreenerResult {
  quotes?: YahooScreenerQuote[];
}

interface MarketMoversCacheEntry {
  payload: MarketMoversResponse;
  expiresAt: number;
}

let marketMoversCache: MarketMoversCacheEntry | null = null;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapScreenerQuote(quote: YahooScreenerQuote): MarketMoverItem | null {
  const ticker = quote.symbol?.trim().toUpperCase();
  const price = quote.regularMarketPrice;
  const changePercent = quote.regularMarketChangePercent;

  if (!ticker || price == null || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  if (changePercent == null || !Number.isFinite(changePercent)) {
    return null;
  }

  return {
    ticker,
    name: quote.longName ?? quote.shortName ?? quote.displayName ?? ticker,
    price: roundMoney(price),
    change: roundMoney(quote.regularMarketChange ?? 0),
    changePercent: roundPercent(changePercent),
    volume: Number.isFinite(quote.regularMarketVolume) ? (quote.regularMarketVolume ?? 0) : 0,
    marketCap: quote.marketCap != null && Number.isFinite(quote.marketCap) ? quote.marketCap : null,
    currency: quote.currency ?? 'USD',
  };
}

type MarketMoversScreenerId =
  | typeof MARKET_MOVERS_GAINERS_SCREENER_ID
  | typeof MARKET_MOVERS_LOSERS_SCREENER_ID;

async function fetchScreenerMovers(screenerId: MarketMoversScreenerId): Promise<MarketMoverItem[]> {
  const result = (await yahooFinance.screener({
    scrIds: screenerId,
    count: MARKET_MOVERS_COUNT,
  })) as YahooScreenerResult;

  const quotes = Array.isArray(result.quotes) ? result.quotes : [];
  const movers: MarketMoverItem[] = [];

  for (const quote of quotes) {
    const mapped = mapScreenerQuote(quote);
    if (!mapped) {
      continue;
    }

    movers.push(mapped);
    if (movers.length >= MARKET_MOVERS_COUNT) {
      break;
    }
  }

  return movers;
}

export async function getMarketMovers(): Promise<MarketMoversResponse> {
  if (marketMoversCache && marketMoversCache.expiresAt > Date.now()) {
    return marketMoversCache.payload;
  }

  try {
    const [gainers, losers] = await Promise.all([
      fetchScreenerMovers(MARKET_MOVERS_GAINERS_SCREENER_ID),
      fetchScreenerMovers(MARKET_MOVERS_LOSERS_SCREENER_ID),
    ]);

    if (gainers.length === 0 && losers.length === 0) {
      throw new AppError(502, 'Market movers data is temporarily unavailable.');
    }

    const payload: MarketMoversResponse = {
      gainers,
      losers,
      fetchedAt: new Date().toISOString(),
    };

    marketMoversCache = {
      payload,
      expiresAt: Date.now() + MARKET_MOVERS_CACHE_TTL_MS,
    };

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ err: error }, 'Failed to fetch Yahoo screener data');
    throw new AppError(502, 'Unable to load market movers. Please try again later.');
  }
}
