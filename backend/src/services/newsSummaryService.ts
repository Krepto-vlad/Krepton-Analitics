import {
  AI_BRIEFING_CACHE_VERSION,
  AI_BRIEFING_SP500_TICKER,
  AI_NEWS_SUMMARY_DISCLAIMER,
  AI_NEWS_SUMMARY_MAX_TICKERS,
  AI_NEWS_SUMMARY_MIN_TICKERS,
} from '../constants.js';
import { isGeminiGroundingEnabled } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { findNewsSummaryCache, saveNewsSummaryCache } from '../repositories/aiRepository.js';
import { assertAiQuotaAvailable, getAiQuotaStatus, recordAiUsage } from './aiQuotaService.js';
import { buildBriefingPromptContext } from './briefingContextService.js';
import { generateBriefingWithGemini } from './geminiClient.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../repositories/portfolioRepository.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { assertValidTickerSymbol, TICKER_FORMAT_ERROR_MESSAGE } from '../utils/tickerValidation.js';
import { getTodayIsoDate } from '../utils/displayCurrency.js';
import type {
  AiQuotaStatus,
  BriefingHoldingContext,
  BriefingMacroSnapshot,
  GenerateNewsSummaryDto,
  NewsSummaryHoldingInsight,
  NewsSummaryMarketBenchmark,
  NewsSummaryPayload,
  NewsSummaryResponse,
} from '../types/ai.types.js';

function buildBriefingCacheKey(tickers: string[], includePortfolioContext: boolean): string {
  const sortedTickers = tickers.slice().sort().join(',');
  const contextFlag = includePortfolioContext ? '1' : '0';
  const groundingFlag = isGeminiGroundingEnabled ? '1' : '0';

  return `${sortedTickers}|${AI_BRIEFING_CACHE_VERSION}|ctx=${contextFlag}|g=${groundingFlag}`;
}

function normalizeSummaryTickers(rawTickers: unknown): string[] {
  if (!Array.isArray(rawTickers)) {
    throw new AppError(400, 'tickers must be an array');
  }

  const normalizedTickers = [
    ...new Set(
      rawTickers
        .filter((value): value is string => typeof value === 'string')
        .map((ticker) => {
          try {
            return assertValidTickerSymbol(ticker);
          } catch {
            throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
          }
        })
    ),
  ].slice(0, AI_NEWS_SUMMARY_MAX_TICKERS);

  if (normalizedTickers.length < AI_NEWS_SUMMARY_MIN_TICKERS) {
    throw new AppError(
      400,
      `Select at least ${AI_NEWS_SUMMARY_MIN_TICKERS} ticker and at most ${AI_NEWS_SUMMARY_MAX_TICKERS}.`
    );
  }

  return normalizedTickers;
}

function normalizeIncludePortfolioContext(rawValue: unknown): boolean {
  return rawValue === true;
}

async function getUserPortfolioTickers(userId: string): Promise<string[]> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);

  return [...new Set(rows.map((row) => row.ticker.toUpperCase()))];
}

function assertTickersBelongToPortfolio(
  requestedTickers: string[],
  portfolioTickers: string[]
): void {
  const portfolioTickerSet = new Set(portfolioTickers);

  for (const ticker of requestedTickers) {
    if (!portfolioTickerSet.has(ticker)) {
      throw new AppError(400, `Ticker ${ticker} is not in your portfolio holdings.`);
    }
  }
}

function mergeHoldingInsight(
  ticker: string,
  payloadInsight: NewsSummaryHoldingInsight | undefined,
  contextHolding: BriefingHoldingContext | undefined,
  includePortfolioContext: boolean
): NewsSummaryHoldingInsight {
  if (payloadInsight) {
    return {
      ...payloadInsight,
      ticker,
      companyName: payloadInsight.companyName || contextHolding?.companyName || ticker,
      price: payloadInsight.price ?? contextHolding?.price ?? null,
      changePercent: payloadInsight.changePercent ?? contextHolding?.changePercent ?? null,
      currency: payloadInsight.currency || contextHolding?.currency || 'USD',
      shares: includePortfolioContext ? contextHolding?.shares : undefined,
      avgBuyPrice: includePortfolioContext ? contextHolding?.avgBuyPrice : undefined,
      unrealizedPnlPercent: includePortfolioContext
        ? contextHolding?.unrealizedPnlPercent
        : undefined,
    };
  }

  return {
    ticker,
    companyName: contextHolding?.companyName ?? ticker,
    price: contextHolding?.price ?? null,
    changePercent: contextHolding?.changePercent ?? null,
    currency: contextHolding?.currency ?? 'USD',
    sentiment: 'neutral',
    summary: 'Limited news coverage for this ticker today.',
    highlights: ['No notable headlines found for this ticker today.'],
    shares: includePortfolioContext ? contextHolding?.shares : undefined,
    avgBuyPrice: includePortfolioContext ? contextHolding?.avgBuyPrice : undefined,
    unrealizedPnlPercent: includePortfolioContext
      ? contextHolding?.unrealizedPnlPercent
      : undefined,
  };
}

function alignHoldingInsights(
  tickers: string[],
  payload: NewsSummaryPayload,
  contextHoldings: BriefingHoldingContext[],
  includePortfolioContext: boolean
): NewsSummaryHoldingInsight[] {
  const insightMap = new Map(
    payload.holdingInsights.map((insight) => [insight.ticker.toUpperCase(), insight])
  );
  const holdingMap = new Map(
    contextHoldings.map((holding) => [holding.ticker.toUpperCase(), holding])
  );

  return tickers.map((ticker) =>
    mergeHoldingInsight(
      ticker,
      insightMap.get(ticker),
      holdingMap.get(ticker),
      includePortfolioContext
    )
  );
}

interface CachedBriefingPayload extends NewsSummaryPayload {
  sources?: NewsSummaryResponse['sources'];
  groundingEnabled?: boolean;
  includePortfolioContext?: boolean;
}

function extractSp500Benchmark(
  macroSnapshots: BriefingMacroSnapshot[]
): NewsSummaryMarketBenchmark | null {
  const snapshot = macroSnapshots.find(
    (entry) => entry.ticker.toUpperCase() === AI_BRIEFING_SP500_TICKER
  );

  if (!snapshot || snapshot.price <= 0) {
    return null;
  }

  return {
    ticker: snapshot.ticker,
    label: snapshot.label,
    price: snapshot.price,
    changePercent: snapshot.changePercent,
  };
}

function buildNewsSummaryResponse(params: {
  summaryDate: string;
  tickers: string[];
  payload: CachedBriefingPayload;
  contextHoldings: BriefingHoldingContext[];
  macroSnapshots: BriefingMacroSnapshot[];
  includePortfolioContext: boolean;
  fromCache: boolean;
  quota: AiQuotaStatus;
}): NewsSummaryResponse {
  return {
    summaryDate: params.summaryDate,
    tickers: params.tickers,
    holdingInsights: alignHoldingInsights(
      params.tickers,
      params.payload,
      params.contextHoldings,
      params.includePortfolioContext
    ),
    marketDrivers: params.payload.marketDrivers ?? [],
    marketBenchmark: extractSp500Benchmark(params.macroSnapshots),
    sources: [],
    disclaimer: AI_NEWS_SUMMARY_DISCLAIMER,
    fromCache: params.fromCache,
    quota: params.quota,
    groundingEnabled: params.payload.groundingEnabled ?? isGeminiGroundingEnabled,
    includePortfolioContext: params.includePortfolioContext,
  };
}

export async function getNewsSummaryQuota(userId: string): Promise<AiQuotaStatus> {
  return getAiQuotaStatus(userId, 'news_summary');
}

export async function generateUserNewsSummary(
  userId: string,
  dto: GenerateNewsSummaryDto
): Promise<NewsSummaryResponse> {
  const tickers = normalizeSummaryTickers(dto.tickers);
  const includePortfolioContext = normalizeIncludePortfolioContext(dto.includePortfolioContext);
  const portfolioTickers = await getUserPortfolioTickers(userId);

  if (portfolioTickers.length === 0) {
    throw new AppError(400, 'Add portfolio holdings before generating an AI news summary.');
  }

  assertTickersBelongToPortfolio(tickers, portfolioTickers);

  const summaryDate = getTodayIsoDate();
  const tickersKey = buildBriefingCacheKey(tickers, includePortfolioContext);
  const cached = await findNewsSummaryCache(userId, tickersKey, summaryDate);

  const briefingContext = await buildBriefingPromptContext(
    userId,
    tickers,
    includePortfolioContext
  );

  if (cached) {
    const quota = await getAiQuotaStatus(userId, 'news_summary');
    return buildNewsSummaryResponse({
      summaryDate,
      tickers,
      payload: cached.summary_payload as CachedBriefingPayload,
      contextHoldings: briefingContext.holdings,
      macroSnapshots: briefingContext.macroSnapshots,
      includePortfolioContext,
      fromCache: true,
      quota,
    });
  }

  await assertAiQuotaAvailable(userId, 'news_summary');

  const generationResult = await generateBriefingWithGemini(briefingContext);

  const cachePayload: CachedBriefingPayload = {
    ...generationResult.payload,
    sources: [],
    groundingEnabled: generationResult.groundingEnabled,
    includePortfolioContext,
  };

  await saveNewsSummaryCache({
    userId,
    tickersKey,
    summaryDate,
    tickers,
    summaryPayload: cachePayload,
  });
  await recordAiUsage(userId, 'news_summary');

  const quota = await getAiQuotaStatus(userId, 'news_summary');

  return buildNewsSummaryResponse({
    summaryDate,
    tickers,
    payload: cachePayload,
    contextHoldings: briefingContext.holdings,
    macroSnapshots: briefingContext.macroSnapshots,
    includePortfolioContext,
    fromCache: false,
    quota,
  });
}
