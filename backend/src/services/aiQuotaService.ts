import {
  AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT,
  AI_EXPLAIN_ALIGNMENT_PAID_DAILY_LIMIT,
  AI_NEWS_SUMMARY_FREE_DAILY_LIMIT,
  AI_NEWS_SUMMARY_PAID_DAILY_LIMIT,
  AI_TICKER_CHAT_FREE_DAILY_LIMIT,
  AI_TICKER_CHAT_PAID_DAILY_LIMIT,
  IMPORT_AI_SCHEMA_FREE_DAILY_LIMIT,
  IMPORT_AI_SCHEMA_PAID_DAILY_LIMIT,
  type AiFeatureId,
} from '../constants.js';
import { countAiUsageSince, insertAiUsageEvent } from '../repositories/aiRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AiQuotaStatus } from '../types/ai.types.js';
import { isPaidUser } from './entitlementService.js';

function getUtcDayStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getNextUtcDayStart(date = new Date()): Date {
  const dayStart = getUtcDayStart(date);
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}

function getDailyLimitForFeature(feature: AiFeatureId, isPaid: boolean): number {
  if (feature === 'news_summary') {
    return isPaid ? AI_NEWS_SUMMARY_PAID_DAILY_LIMIT : AI_NEWS_SUMMARY_FREE_DAILY_LIMIT;
  }

  if (feature === 'explain_alignment') {
    return isPaid ? AI_EXPLAIN_ALIGNMENT_PAID_DAILY_LIMIT : AI_EXPLAIN_ALIGNMENT_FREE_DAILY_LIMIT;
  }

  if (feature === 'import_schema') {
    return isPaid ? IMPORT_AI_SCHEMA_PAID_DAILY_LIMIT : IMPORT_AI_SCHEMA_FREE_DAILY_LIMIT;
  }

  if (feature === 'ticker_chat') {
    return isPaid ? AI_TICKER_CHAT_PAID_DAILY_LIMIT : AI_TICKER_CHAT_FREE_DAILY_LIMIT;
  }

  return 0;
}

export async function getAiQuotaStatus(
  userId: string,
  feature: AiFeatureId
): Promise<AiQuotaStatus> {
  const isPaid = await isPaidUser(userId);
  const limit = getDailyLimitForFeature(feature, isPaid);
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

/**
 * Increment the UTC-day counter only after a usable AI payload is ready to return.
 * Call this after Gemini succeeds. Timeouts, 502/503, and empty replies must not call it.
 * Successful completions still count when we sanitize or fact-check the text (anti-abuse).
 */
export async function recordAiUsage(userId: string, feature: AiFeatureId): Promise<void> {
  await insertAiUsageEvent(userId, feature);
}
