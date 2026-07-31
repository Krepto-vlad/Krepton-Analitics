import { pool } from '../config/db.js';
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

async function findAiFeatureCache<TPayload>(
  userId: string,
  cacheKey: string,
  cacheDate: string
): Promise<AiFeatureCacheRow<TPayload> | null> {
  const result = await pool.query<AiFeatureCacheRow<TPayload>>(
    `SELECT id, user_id, tickers_key, summary_date::text AS summary_date,
            tickers, summary_payload, created_at
     FROM ai_news_summaries
     WHERE user_id = $1 AND tickers_key = $2 AND summary_date = $3`,
    [userId, cacheKey, cacheDate]
  );

  return result.rows[0] ?? null;
}

async function saveAiFeatureCache(params: {
  userId: string;
  cacheKey: string;
  cacheDate: string;
  tags: string[];
  payload: unknown;
}): Promise<void> {
  await pool.query(
    `INSERT INTO ai_news_summaries (user_id, tickers_key, summary_date, tickers, summary_payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, tickers_key, summary_date)
     DO UPDATE SET
       tickers = EXCLUDED.tickers,
       summary_payload = EXCLUDED.summary_payload,
       created_at = NOW()`,
    [
      params.userId,
      params.cacheKey,
      params.cacheDate,
      JSON.stringify(params.tags),
      JSON.stringify(params.payload),
    ]
  );
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
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM ai_usage_events
     WHERE user_id = $1 AND feature = $2 AND created_at >= $3`,
    [userId, feature, since.toISOString()]
  );

  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function insertAiUsageEvent(userId: string, feature: AiFeatureId): Promise<void> {
  await pool.query(
    `INSERT INTO ai_usage_events (user_id, feature)
     VALUES ($1, $2)`,
    [userId, feature]
  );
}
