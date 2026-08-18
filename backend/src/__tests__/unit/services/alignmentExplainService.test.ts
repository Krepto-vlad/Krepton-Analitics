jest.mock('../../../services/aiQuotaService.js', () => ({
  assertAiQuotaAvailable: jest.fn(),
  getAiQuotaStatus: jest.fn(),
  recordAiUsage: jest.fn(),
}));

jest.mock('../../../services/geminiClient.js', () => ({
  generateAlignmentExplanationWithGemini: jest.fn(),
}));

jest.mock('../../../services/portfolioService.js', () => ({
  getUserPortfolioRebalancingAnalysis: jest.fn(),
}));

jest.mock('../../../repositories/aiRepository.js', () => ({
  findAlignmentExplanationCache: jest.fn(),
  saveAlignmentExplanationCache: jest.fn(),
}));

import { AI_EXPLAIN_ALIGNMENT_DISCLAIMER } from '../../../constants.js';
import {
  findAlignmentExplanationCache,
  saveAlignmentExplanationCache,
} from '../../../repositories/aiRepository.js';
import {
  assertAiQuotaAvailable,
  getAiQuotaStatus,
  recordAiUsage,
} from '../../../services/aiQuotaService.js';
import {
  generateAlignmentExplanation,
  getAlignmentExplanationQuota,
} from '../../../services/alignmentExplainService.js';
import { generateAlignmentExplanationWithGemini } from '../../../services/geminiClient.js';
import { getUserPortfolioRebalancingAnalysis } from '../../../services/portfolioService.js';
import type { AlignmentExplanationPayload } from '../../../types/ai.types.js';
import type { RebalancingAnalysisResponse } from '../../../types/rebalancing.types.js';

const mockedQuota = getAiQuotaStatus as jest.MockedFunction<typeof getAiQuotaStatus>;
const mockedAssertQuota = assertAiQuotaAvailable as jest.MockedFunction<
  typeof assertAiQuotaAvailable
>;
const mockedRecord = recordAiUsage as jest.MockedFunction<typeof recordAiUsage>;
const mockedFindCache = findAlignmentExplanationCache as jest.MockedFunction<
  typeof findAlignmentExplanationCache
>;
const mockedSaveCache = saveAlignmentExplanationCache as jest.MockedFunction<
  typeof saveAlignmentExplanationCache
>;
const mockedAnalysis = getUserPortfolioRebalancingAnalysis as jest.MockedFunction<
  typeof getUserPortfolioRebalancingAnalysis
>;
const mockedGemini = generateAlignmentExplanationWithGemini as jest.MockedFunction<
  typeof generateAlignmentExplanationWithGemini
>;

const quotaStatus = {
  used: 0,
  limit: 5,
  remaining: 5,
  resetsAt: '2026-01-02T00:00:00.000Z',
};

function analysis(
  overrides: Partial<RebalancingAnalysisResponse> = {}
): RebalancingAnalysisResponse {
  return {
    strategyId: 'warren-buffett-9010',
    strategyName: 'Warren Buffett 90/10',
    strategyDescription: 'Test',
    strategyPhilosophy: 'Equities first',
    investmentHorizon: '10+ years',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    displayCurrency: 'USD',
    totalPortfolioValue: 10000,
    alignmentScore: 72.4,
    targetAllocations: [],
    currentAllocations: [],
    deviations: [
      {
        bucketId: 'equities',
        label: 'Equities',
        color: '#000',
        currentPercent: 80,
        targetPercent: 90,
        deviationPercent: -10,
        status: 'underweight',
      },
    ],
    tickerMappings: [
      {
        ticker: 'VOO',
        sector: 'N/A',
        marketValue: 9000,
        bucketId: 'equities',
        bucketLabel: 'Equities',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
    ],
    ...overrides,
  };
}

const payload: AlignmentExplanationPayload = {
  overview: 'Slightly underweight equities.',
  keyDrifts: [{ title: 'Equities', explanation: 'Need more stock exposure.' }],
  whatItMeans: 'Stay the course.',
};

describe('alignmentExplainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuota.mockResolvedValue(quotaStatus);
    mockedAssertQuota.mockResolvedValue(quotaStatus);
    mockedRecord.mockResolvedValue(undefined);
    mockedSaveCache.mockResolvedValue(undefined);
    mockedAnalysis.mockResolvedValue(analysis());
  });

  it('returns quota for the explain_alignment feature', async () => {
    await expect(getAlignmentExplanationQuota('user-1')).resolves.toEqual(quotaStatus);
    expect(mockedQuota).toHaveBeenCalledWith('user-1', 'explain_alignment');
  });

  it('rejects an empty portfolio', async () => {
    mockedAnalysis.mockResolvedValue(analysis({ tickerMappings: [], totalPortfolioValue: 0 }));

    await expect(generateAlignmentExplanation('user-1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns a cached explanation without calling Gemini', async () => {
    mockedFindCache.mockResolvedValue({
      summary_payload: payload,
    } as Awaited<ReturnType<typeof findAlignmentExplanationCache>>);

    const result = await generateAlignmentExplanation('user-1');

    expect(result.fromCache).toBe(true);
    expect(result.overview).toBe(payload.overview);
    expect(result.alignmentScore).toBe(72);
    expect(result.disclaimer).toBe(AI_EXPLAIN_ALIGNMENT_DISCLAIMER);
    expect(result.falseDiversification.riskLevel).toBe('none');
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedAssertQuota).not.toHaveBeenCalled();
  });

  it('generates, caches, and records usage on a cache miss', async () => {
    mockedFindCache.mockResolvedValue(null);
    mockedGemini.mockResolvedValue({
      ...payload,
      falseDiversification: {
        riskLevel: 'low',
        title: 'Overlap',
        explanation: 'Two US equity funds.',
      },
    });

    const result = await generateAlignmentExplanation('user-1', 'USD');

    expect(mockedGemini).toHaveBeenCalled();
    expect(mockedSaveCache).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', strategyId: 'warren-buffett-9010' })
    );
    expect(mockedRecord).toHaveBeenCalledWith('user-1', 'explain_alignment');
    expect(result.fromCache).toBe(false);
    expect(result.falseDiversification.riskLevel).toBe('low');
  });
});
