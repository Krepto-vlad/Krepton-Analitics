import { AI_BRIEFING_MACRO_TICKERS } from '../constants.js';
import { isGeminiGroundingEnabled } from '../config/env.js';
import { getPortfolioNews } from './newsService.js';
import { getCachedStockQuotes } from './quoteCacheService.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../repositories/portfolioRepository.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { getTodayIsoDate } from '../utils/displayCurrency.js';
import type { PositionRow } from '../types/portfolio.types.js';
import type { BriefingHoldingContext, BriefingPromptContext } from '../types/ai.types.js';
import type { PortfolioNewsItem } from '../types/news.types.js';

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeUnrealizedPnlPercent(avgBuyPrice: number, currentPrice: number): number {
  if (avgBuyPrice <= 0) {
    return 0;
  }

  return roundPercent(((currentPrice - avgBuyPrice) / avgBuyPrice) * 100);
}

function mapNewsItemsToHeadlineLines(newsItems: PortfolioNewsItem[]): string[] {
  return newsItems.map((item) => {
    const ticker = item.tickers[0] ?? 'UNKNOWN';
    return `- [${ticker}] ${item.headline} (${item.source}, ${item.publishedAt})`;
  });
}

function buildHoldingContext(
  row: PositionRow,
  quoteMap: Map<string, { price: number; changePercent: number; currency: string }>,
  includePortfolioContext: boolean
): BriefingHoldingContext {
  const ticker = row.ticker.toUpperCase();
  const quote = quoteMap.get(ticker);
  const price = quote?.price ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const currency = quote?.currency ?? row.currency;
  const shares = parseFloat(row.shares);
  const avgBuyPrice = parseFloat(row.avg_buy_price);

  const holding: BriefingHoldingContext = {
    ticker,
    companyName: row.company_name,
    sector: row.sector,
    price,
    changePercent: roundPercent(changePercent),
    currency,
  };

  if (includePortfolioContext) {
    holding.shares = shares;
    holding.avgBuyPrice = avgBuyPrice;
    holding.unrealizedPnlPercent = computeUnrealizedPnlPercent(avgBuyPrice, price);
  }

  return holding;
}

export async function buildBriefingPromptContext(
  userId: string,
  tickers: string[],
  includePortfolioContext: boolean
): Promise<BriefingPromptContext> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);
  const selectedTickerSet = new Set(tickers.map((ticker) => ticker.toUpperCase()));
  const selectedRows = rows.filter((row) => selectedTickerSet.has(row.ticker.toUpperCase()));

  const macroTickers = AI_BRIEFING_MACRO_TICKERS.map((entry) => entry.ticker);
  const quoteTickers = [
    ...new Set([...tickers.map((ticker) => ticker.toUpperCase()), ...macroTickers]),
  ];
  const quotes = await getCachedStockQuotes(quoteTickers);

  const quoteMap = new Map(
    quotes.map((quote) => [
      quote.ticker.toUpperCase(),
      {
        price: quote.price,
        changePercent: quote.changePercent,
        currency: quote.currency,
      },
    ])
  );

  const holdings = selectedRows.map((row) =>
    buildHoldingContext(row, quoteMap, includePortfolioContext)
  );

  const macroSnapshots = AI_BRIEFING_MACRO_TICKERS.map((entry) => {
    const quote = quoteMap.get(entry.ticker);
    return {
      ticker: entry.ticker,
      label: entry.label,
      price: quote?.price ?? 0,
      changePercent: roundPercent(quote?.changePercent ?? 0),
    };
  });

  const newsItems = await getPortfolioNews(tickers);

  return {
    summaryDate: getTodayIsoDate(),
    holdings,
    macroSnapshots,
    headlineLines: mapNewsItemsToHeadlineLines(newsItems),
    includePortfolioContext,
    groundingEnabled: isGeminiGroundingEnabled,
  };
}
