import YahooFinance from 'yahoo-finance2';
import { FUND_PROFILE_CACHE_TTL_MS, FUND_PROFILE_MISS_CACHE_TTL_MS } from '../constants.js';
import { logger } from '../utils/logger.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface FundProfileSnapshot {
  categoryName: string | null;
  stockPosition: number | null;
}

interface CacheEntry {
  snapshot: FundProfileSnapshot | null;
  expiresAt: number;
}

interface YahooFundSummary {
  fundProfile?: { categoryName?: string | null };
  topHoldings?: { stockPosition?: number };
}

const fundProfileCache = new Map<string, CacheEntry>();

function readSnapshot(summary: YahooFundSummary): FundProfileSnapshot {
  const categoryName = summary.fundProfile?.categoryName?.trim() || null;
  const stockPosition = summary.topHoldings?.stockPosition;
  return {
    categoryName,
    stockPosition:
      typeof stockPosition === 'number' && Number.isFinite(stockPosition) ? stockPosition : null,
  };
}

async function fetchFundProfile(ticker: string): Promise<FundProfileSnapshot | null> {
  try {
    const summary = (await yahooFinance.quoteSummary(
      ticker,
      { modules: ['fundProfile', 'topHoldings'] },
      { validateResult: false }
    )) as YahooFundSummary;
    return readSnapshot(summary ?? {});
  } catch (error) {
    logger.warn({ ticker, err: error }, 'Fund profile fetch failed');
    return null;
  }
}

export async function getFundProfileSnapshots(
  tickers: readonly string[]
): Promise<Map<string, FundProfileSnapshot>> {
  const uniqueTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()))].filter(
    Boolean
  );
  const snapshots = new Map<string, FundProfileSnapshot>();
  const now = Date.now();

  for (const ticker of uniqueTickers) {
    const cached = fundProfileCache.get(ticker);
    if (cached && cached.expiresAt > now) {
      if (cached.snapshot) {
        snapshots.set(ticker, cached.snapshot);
      }
      continue;
    }

    const snapshot = await fetchFundProfile(ticker);
    fundProfileCache.set(ticker, {
      snapshot,
      expiresAt: now + (snapshot ? FUND_PROFILE_CACHE_TTL_MS : FUND_PROFILE_MISS_CACHE_TTL_MS),
    });
    if (snapshot) {
      snapshots.set(ticker, snapshot);
    }
  }

  return snapshots;
}
