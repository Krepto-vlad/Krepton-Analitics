import {
  AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT,
  AI_NEWS_SUMMARY_FREE_DAILY_LIMIT,
  IMPORT_AI_SCHEMA_FREE_DAILY_LIMIT,
  type AiFeatureId,
} from '../constants.js';
import { countAiUsageSince, insertAiUsageEvent } from '../repositories/aiRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AiQuotaStatus } from '../types/ai.types.js';

function getUtcDayStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getNextUtcDayStart(date = new Date()): Date {
  const dayStart = getUtcDayStart(date);
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}

function getDailyLimitForFeature(feature: AiFeatureId): number {
  if (feature === 'news_summary') {
    return AI_NEWS_SUMMARY_FREE_DAILY_LIMIT;
  }

  if (feature === 'explain_alignment') {
    return AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT;
  }

  if (feature === 'import_schema') {
    return IMPORT_AI_SCHEMA_FREE_DAILY_LIMIT;
  }

  return 0;
}

export async function getAiQuotaStatus(
  userId: string,
  feature: AiFeatureId
): Promise<AiQuotaStatus> {
  const limit = getDailyLimitForFeature(feature);
  const used = await countAiUsageSince(userId, feature, getUtcDayStart());
  const remaining = Math.max(limit - used, 0);

  return {
    used,
    limit,
    remaining,
    resetsAt: getNextUtcDayStart().toISOString(),
  };
}

export async function assertAiQuotaAvailable(
  userId: string,
  feature: AiFeatureId
): Promise<AiQuotaStatus> {
  const quota = await getAiQuotaStatus(userId, feature);

  if (quota.remaining <= 0) {
    throw new AppError(
      429,
      `Daily AI limit reached (${quota.limit} per day). Resets at ${quota.resetsAt}.`
    );
  }

  return quota;
}

export async function recordAiUsage(userId: string, feature: AiFeatureId): Promise<void> {
  await insertAiUsageEvent(userId, feature);
}
