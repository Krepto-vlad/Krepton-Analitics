import axios from 'axios';
import {
  PORTFOLIO_NEWS_CACHE_TTL_MS,
  PORTFOLIO_NEWS_MAX_ITEMS,
  PORTFOLIO_NEWS_MAX_TICKERS,
  PORTFOLIO_NEWS_PER_TICKER,
} from '../constants.js';
import type { PortfolioNewsItem } from '../types/news.types.js';

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';

const yahooClient = axios.create({
  baseURL: YAHOO_BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
  },
  timeout: 10000,
});

interface YahooNewsArticle {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  relatedTickers?: string[];
}

interface NewsCacheEntry {
  expiresAt: number;
  items: PortfolioNewsItem[];
}

const newsCache = new Map<string, NewsCacheEntry>();

function buildCacheKey(tickers: string[]): string {
  return tickers.slice().sort().join(',');
}

function formatTimeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;

  if (diffMs < 60_000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function normalizeTickers(tickers: string[]): string[] {
  return [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    PORTFOLIO_NEWS_MAX_TICKERS
  );
}

async function fetchNewsForTicker(ticker: string): Promise<YahooNewsArticle[]> {
  const { data } = await yahooClient.get<{ news?: YahooNewsArticle[] }>('/v1/finance/search', {
    params: {
      q: ticker,
      quotesCount: 0,
      newsCount: PORTFOLIO_NEWS_PER_TICKER,
      listsCount: 0,
    },
  });

  return data?.news ?? [];
}

function mapYahooArticle(
  article: YahooNewsArticle,
  portfolioTickers: Set<string>,
  fallbackTicker: string
): PortfolioNewsItem | null {
  if (!article.uuid || !article.title || !article.link || !article.providerPublishTime) {
    return null;
  }

  const relatedFromArticle = (article.relatedTickers ?? [])
    .map((symbol) => symbol.toUpperCase())
    .filter((symbol) => portfolioTickers.has(symbol));

  const tickers =
    relatedFromArticle.length > 0
      ? [...new Set(relatedFromArticle)]
      : portfolioTickers.has(fallbackTicker)
        ? [fallbackTicker]
        : [];

  if (tickers.length === 0) {
    return null;
  }

  return {
    id: article.uuid,
    tickers,
    source: article.publisher?.trim() || 'Yahoo Finance',
    timeAgo: formatTimeAgo(article.providerPublishTime),
    headline: article.title.trim(),
    url: article.link,
    publishedAt: new Date(article.providerPublishTime * 1000).toISOString(),
  };
}

export async function getPortfolioNews(tickers: string[]): Promise<PortfolioNewsItem[]> {
  const normalizedTickers = normalizeTickers(tickers);

  if (normalizedTickers.length === 0) {
    return [];
  }

  const cacheKey = buildCacheKey(normalizedTickers);
  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const portfolioTickerSet = new Set(normalizedTickers);
  const articleMap = new Map<string, PortfolioNewsItem>();

  const results = await Promise.allSettled(
    normalizedTickers.map(async (ticker) => ({
      ticker,
      articles: await fetchNewsForTicker(ticker),
    }))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      console.warn('[NewsService] Ticker news fetch failed:', result.reason);
      continue;
    }

    for (const article of result.value.articles) {
      const mapped = mapYahooArticle(article, portfolioTickerSet, result.value.ticker);
      if (!mapped) continue;

      const existing = articleMap.get(mapped.id);
      if (existing) {
        existing.tickers = [...new Set([...existing.tickers, ...mapped.tickers])];
        continue;
      }

      articleMap.set(mapped.id, mapped);
    }
  }

  const items = [...articleMap.values()]
    .sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
    )
    .slice(0, PORTFOLIO_NEWS_MAX_ITEMS);

  newsCache.set(cacheKey, {
    items,
    expiresAt: Date.now() + PORTFOLIO_NEWS_CACHE_TTL_MS,
  });

  return items;
}

export function clearPortfolioNewsCache(): void {
  newsCache.clear();
}
