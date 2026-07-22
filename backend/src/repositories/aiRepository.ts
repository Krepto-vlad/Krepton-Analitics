import { pool } from '../config/db.js';
import type { AiFeatureId } from '../constants.js';
import type { AiNewsSummaryRow, NewsSummaryPayload } from '../types/ai.types.js';

export async function findNewsSummaryCache(
  userId: string,
  tickersKey: string,
  summaryDate: string
): Promise<AiNewsSummaryRow | null> {
  const result = await pool.query<AiNewsSummaryRow>(
    `SELECT id, user_id, tickers_key, summary_date::text AS summary_date,
            tickers, summary_payload, created_at
     FROM ai_news_summaries
     WHERE user_id = $1 AND tickers_key = $2 AND summary_date = $3`,
    [userId, tickersKey, summaryDate]
  );

  return result.rows[0] ?? null;
}

export async function saveNewsSummaryCache(params: {
  userId: string;
  tickersKey: string;
  summaryDate: string;
  tickers: string[];
  summaryPayload: NewsSummaryPayload;
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
      params.tickersKey,
      params.summaryDate,
      JSON.stringify(params.tickers),
      JSON.stringify(params.summaryPayload),
    ]
  );
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
