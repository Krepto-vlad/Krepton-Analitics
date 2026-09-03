jest.mock('../../../repositories/aiRepository.js', () => ({
  countAiUsageSince: jest.fn(),
  insertAiUsageEvent: jest.fn(),
}));

import {
  AI_NEWS_SUMMARY_FREE_DAILY_LIMIT,
  AI_TICKER_CHAT_FREE_DAILY_LIMIT,
} from '../../../constants.js';
import { countAiUsageSince, insertAiUsageEvent } from '../../../repositories/aiRepository.js';
import {
  assertAiQuotaAvailable,
  getAiQuotaStatus,
  recordAiUsage,
} from '../../../services/aiQuotaService.js';

const mockedCount = countAiUsageSince as jest.MockedFunction<typeof countAiUsageSince>;
const mockedInsert = insertAiUsageEvent as jest.MockedFunction<typeof insertAiUsageEvent>;

describe('aiQuotaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes remaining against the feature daily limit', async () => {
    mockedCount.mockResolvedValue(2);

    const quota = await getAiQuotaStatus('user-1', 'news_summary');

    expect(quota.used).toBe(2);
    expect(quota.limit).toBe(AI_NEWS_SUMMARY_FREE_DAILY_LIMIT);
    expect(quota.remaining).toBe(AI_NEWS_SUMMARY_FREE_DAILY_LIMIT - 2);
    expect(quota.resetsAt).toEqual(expect.any(String));
  });

  it('clamps remaining at zero when usage exceeds the limit', async () => {
    mockedCount.mockResolvedValue(AI_TICKER_CHAT_FREE_DAILY_LIMIT + 5);

    const quota = await getAiQuotaStatus('user-1', 'ticker_chat');

    expect(quota.remaining).toBe(0);
    expect(quota.limit).toBe(AI_TICKER_CHAT_FREE_DAILY_LIMIT);
  });

  it('throws 429 when no remaining quota', async () => {
    mockedCount.mockResolvedValue(AI_NEWS_SUMMARY_FREE_DAILY_LIMIT);

    await expect(assertAiQuotaAvailable('user-1', 'news_summary')).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('returns the quota when remaining is positive', async () => {
    mockedCount.mockResolvedValue(0);

    const quota = await assertAiQuotaAvailable('user-1', 'import_schema');

    expect(quota.remaining).toBeGreaterThan(0);
  });

  it('records a usage event', async () => {
    mockedInsert.mockResolvedValue(undefined);

    await recordAiUsage('user-1', 'explain_alignment');

    expect(mockedInsert).toHaveBeenCalledWith('user-1', 'explain_alignment');
  });
});
