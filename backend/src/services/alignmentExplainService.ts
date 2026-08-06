import { createHash } from 'crypto';
import {
  AI_EXPLAIN_ALIGNMENT_CACHE_VERSION,
  AI_EXPLAIN_ALIGNMENT_DISCLAIMER,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  findAlignmentExplanationCache,
  saveAlignmentExplanationCache,
} from '../repositories/aiRepository.js';
import { getTodayIsoDate } from '../utils/displayCurrency.js';
import type {
  AlignmentExplanationPayload,
  AlignmentExplanationResponse,
  AlignmentFalseDiversificationInsight,
  AlignmentPromptContext,
  AiQuotaStatus,
} from '../types/ai.types.js';
import type { RebalancingAnalysisResponse } from '../types/rebalancing.types.js';
import { assertAiQuotaAvailable, getAiQuotaStatus, recordAiUsage } from './aiQuotaService.js';
import {
  buildAlignmentHoldingsForPrompt,
  buildFalseDiversificationHints,
} from './falseDiversificationHints.js';
import { generateAlignmentExplanationWithGemini } from './geminiClient.js';
import { getUserPortfolioRebalancingAnalysis } from './portfolioService.js';

const MATERIAL_DRIFT_THRESHOLD_PP = 1;

const FALLBACK_FALSE_DIVERSIFICATION: AlignmentFalseDiversificationInsight = {
  riskLevel: 'none',
  title: 'False diversification',
  explanation:
    'No clear false-diversification signal from the available holdings and overlap hints.',
};

function buildAlignmentCacheKey(analysis: RebalancingAnalysisResponse): string {
  const deviationFingerprint = analysis.deviations
    .map(
      (item) =>
        `${item.bucketId}:${item.currentPercent.toFixed(1)}:${item.targetPercent.toFixed(1)}`
    )
    .sort()
    .join('|');

  const fingerprintHash = createHash('sha256')
    .update(deviationFingerprint)
    .digest('hex')
    .slice(0, 16);

  return [
    'align',
    AI_EXPLAIN_ALIGNMENT_CACHE_VERSION,
    analysis.strategyId,
    `score=${Math.round(analysis.alignmentScore)}`,
    fingerprintHash,
  ].join('|');
}

function buildAlignmentPromptContext(
  analysis: RebalancingAnalysisResponse,
  explanationDate: string
): AlignmentPromptContext {
  const materialDeviations = analysis.deviations
    .filter((item) => Math.abs(item.deviationPercent) >= MATERIAL_DRIFT_THRESHOLD_PP)
    .sort((left, right) => Math.abs(right.deviationPercent) - Math.abs(left.deviationPercent));

  const deviationsForPrompt =
    materialDeviations.length > 0 ? materialDeviations : analysis.deviations;

  const topHoldings = buildAlignmentHoldingsForPrompt(analysis);
  const falseDiversificationHints = buildFalseDiversificationHints(topHoldings);

  return {
    explanationDate,
    strategyName: analysis.strategyName,
    strategyPhilosophy: analysis.strategyPhilosophy,
    investmentHorizon: analysis.investmentHorizon,
    alignmentScore: Math.round(analysis.alignmentScore),
    totalPortfolioValue: analysis.totalPortfolioValue,
    displayCurrency: analysis.displayCurrency,
    deviations: deviationsForPrompt.map((item) => ({
      label: item.label,
      currentPercent: item.currentPercent,
      targetPercent: item.targetPercent,
      deviationPercent: item.deviationPercent,
      status: item.status,
    })),
    topHoldings,
    falseDiversificationHints,
  };
}

function buildAlignmentExplanationResponse(params: {
  explanationDate: string;
  analysis: RebalancingAnalysisResponse;
  payload: AlignmentExplanationPayload;
  fromCache: boolean;
  quota: AiQuotaStatus;
}): AlignmentExplanationResponse {
  return {
    explanationDate: params.explanationDate,
    strategyId: params.analysis.strategyId,
    strategyName: params.analysis.strategyName,
    alignmentScore: Math.round(params.analysis.alignmentScore),
    overview: params.payload.overview,
    keyDrifts: params.payload.keyDrifts,
    falseDiversification: params.payload.falseDiversification ?? FALLBACK_FALSE_DIVERSIFICATION,
    whatItMeans: params.payload.whatItMeans,
    disclaimer: AI_EXPLAIN_ALIGNMENT_DISCLAIMER,
    fromCache: params.fromCache,
    quota: params.quota,
  };
}

export async function getAlignmentExplanationQuota(userId: string): Promise<AiQuotaStatus> {
  return getAiQuotaStatus(userId, 'explain_alignment');
}

export async function generateAlignmentExplanation(
  userId: string,
  rawDisplayCurrency?: unknown
): Promise<AlignmentExplanationResponse> {
  const analysis = await getUserPortfolioRebalancingAnalysis(userId, rawDisplayCurrency);

  if (analysis.tickerMappings.length === 0 || analysis.totalPortfolioValue <= 0) {
    throw new AppError(400, 'Add portfolio holdings before generating an alignment explanation.');
  }

  const explanationDate = getTodayIsoDate();
  const cacheKey = buildAlignmentCacheKey(analysis);
  const cached = await findAlignmentExplanationCache(userId, cacheKey, explanationDate);

  if (cached) {
    const quota = await getAiQuotaStatus(userId, 'explain_alignment');
    return buildAlignmentExplanationResponse({
      explanationDate,
      analysis,
      payload: cached.summary_payload,
      fromCache: true,
      quota,
    });
  }

  await assertAiQuotaAvailable(userId, 'explain_alignment');

  const promptContext = buildAlignmentPromptContext(analysis, explanationDate);
  const payload = await generateAlignmentExplanationWithGemini(promptContext);

  await saveAlignmentExplanationCache({
    userId,
    cacheKey,
    explanationDate,
    strategyId: analysis.strategyId,
    payload,
  });
  await recordAiUsage(userId, 'explain_alignment');

  const quota = await getAiQuotaStatus(userId, 'explain_alignment');

  return buildAlignmentExplanationResponse({
    explanationDate,
    analysis,
    payload,
    fromCache: false,
    quota,
  });
}
