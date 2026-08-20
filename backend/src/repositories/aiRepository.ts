import { and, count, eq, gte, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { aiNewsSummaries, aiUsageEvents } from '../db/schema.js';
import type { AiFeatureId } from '../constants.js';
import type {
  AiNewsSummaryRow,
  AlignmentExplanationPayload,
  NewsSummaryPayload,
} from '../types/ai.types.js';

interface AiFeatureCacheRow<TPayload> {
  id: string;
  user_id: string;
  tickers_key: string;
  summary_date: string;
  tickers: string[];
  summary_payload: TPayload;
  created_at: Date;
}

function toCacheRow<TPayload>(
  row: typeof aiNewsSummaries.$inferSelect
): AiFeatureCacheRow<TPayload> {
  return {
    id: row.id,
    user_id: row.user_id,
    tickers_key: row.tickers_key,
    summary_date: row.summary_date,
    tickers: row.tickers,
    summary_payload: row.summary_payload as TPayload,
    created_at: row.created_at,
  };
}

async function findAiFeatureCache<TPayload>(
  userId: string,
  cacheKey: string,
  cacheDate: string
): Promise<AiFeatureCacheRow<TPayload> | null> {
  const rows = await db
    .select()
    .from(aiNewsSummaries)
    .where(
      and(
        eq(aiNewsSummaries.user_id, userId),
        eq(aiNewsSummaries.tickers_key, cacheKey),
        eq(aiNewsSummaries.summary_date, cacheDate)
      )
    )
    .limit(1);

  return rows[0] ? toCacheRow<TPayload>(rows[0]) : null;
}

async function saveAiFeatureCache(params: {
  userId: string;
  cacheKey: string;
  cacheDate: string;
  tags: string[];
  payload: NewsSummaryPayload | AlignmentExplanationPayload;
}): Promise<void> {
  await db
    .insert(aiNewsSummaries)
    .values({
      user_id: params.userId,
      tickers_key: params.cacheKey,
      summary_date: params.cacheDate,
      tickers: params.tags,
      summary_payload: params.payload,
    })
    .onConflictDoUpdate({
      target: [aiNewsSummaries.user_id, aiNewsSummaries.tickers_key, aiNewsSummaries.summary_date],
      set: {
        tickers: params.tags,
        summary_payload: params.payload,
        created_at: sql`NOW()`,
      },
    });
}

export async function findNewsSummaryCache(
  userId: string,
  tickersKey: string,
  summaryDate: string
): Promise<AiNewsSummaryRow | null> {
  return findAiFeatureCache<NewsSummaryPayload>(userId, tickersKey, summaryDate);
}

export async function saveNewsSummaryCache(params: {
  userId: string;
  tickersKey: string;
  summaryDate: string;
  tickers: string[];
  summaryPayload: NewsSummaryPayload;
}): Promise<void> {
  await saveAiFeatureCache({
    userId: params.userId,
    cacheKey: params.tickersKey,
    cacheDate: params.summaryDate,
    tags: params.tickers,
    payload: params.summaryPayload,
  });
}

export async function findAlignmentExplanationCache(
  userId: string,
  cacheKey: string,
  explanationDate: string
): Promise<AiFeatureCacheRow<AlignmentExplanationPayload> | null> {
  return findAiFeatureCache<AlignmentExplanationPayload>(userId, cacheKey, explanationDate);
}

export async function saveAlignmentExplanationCache(params: {
  userId: string;
  cacheKey: string;
  explanationDate: string;
  strategyId: string;
  payload: AlignmentExplanationPayload;
}): Promise<void> {
  await saveAiFeatureCache({
    userId: params.userId,
    cacheKey: params.cacheKey,
    cacheDate: params.explanationDate,
    tags: [params.strategyId],
    payload: params.payload,
  });
}

export async function countAiUsageSince(
  userId: string,
  feature: AiFeatureId,
  since: Date
): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(aiUsageEvents)
    .where(
      and(
        eq(aiUsageEvents.user_id, userId),
        eq(aiUsageEvents.feature, feature),
        gte(aiUsageEvents.created_at, since)
      )
    );

  return Number(rows[0]?.value ?? 0);
}

export async function insertAiUsageEvent(userId: string, feature: AiFeatureId): Promise<void> {
  await db.insert(aiUsageEvents).values({
    user_id: userId,
    feature,
  });
}
