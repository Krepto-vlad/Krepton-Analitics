import { AI_FEATURES } from '../../constants.js';
import {
  countAiUsageSince,
  findAlignmentExplanationCache,
  findNewsSummaryCache,
  insertAiUsageEvent,
  saveAlignmentExplanationCache,
  saveNewsSummaryCache,
} from '../../repositories/aiRepository.js';
import type { AiFeatureId } from '../../constants.js';
import type { AlignmentExplanationPayload, NewsSummaryPayload } from '../../types/ai.types.js';
import { MILLISECONDS_PER_DAY, POSTGRES_ERROR_CODE } from './helpers/dbTestConstants.js';
import {
  captureDatabaseError,
  closeTestDatabasePool,
  createTestUser,
  truncateAllTables,
} from './helpers/testDatabase.js';

const NEWS_FEATURE: AiFeatureId = 'news_summary';
const CHAT_FEATURE: AiFeatureId = 'ticker_chat';
const UNSUPPORTED_FEATURE = 'unsupported_feature';
const UNKNOWN_USER_ID = '00000000-0000-4000-8000-000000000000';
const TICKERS_KEY = 'AAPL,MSFT';
const CACHE_DATE = '2026-02-10';
const NEXT_CACHE_DATE = '2026-02-11';
const ALIGNMENT_CACHE_KEY = 'ray-dalio-all-weather:abc123';
const ALIGNMENT_STRATEGY_ID = 'ray-dalio-all-weather';

const NEWS_PAYLOAD: NewsSummaryPayload = { holdingInsights: [], marketDrivers: [] };
const ALIGNMENT_PAYLOAD: AlignmentExplanationPayload = {
  overview: 'The portfolio leans towards equities.',
  keyDrifts: [],
  whatItMeans: 'Consider rebalancing towards bonds.',
};

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('news summary cache', () => {
  it('returns null before anything is cached', async () => {
    const user = await createTestUser();

    expect(await findNewsSummaryCache(user.id, TICKERS_KEY, CACHE_DATE)).toBeNull();
  });

  it('stores a summary and finds it for the same user, tickers and day only', async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    await saveNewsSummaryCache({
      userId: user.id,
      tickersKey: TICKERS_KEY,
      summaryDate: CACHE_DATE,
      tickers: ['AAPL', 'MSFT'],
      summaryPayload: NEWS_PAYLOAD,
    });

    const cached = await findNewsSummaryCache(user.id, TICKERS_KEY, CACHE_DATE);

    expect(cached?.tickers).toEqual(['AAPL', 'MSFT']);
    expect(cached?.summary_payload).toEqual(NEWS_PAYLOAD);
    expect(await findNewsSummaryCache(otherUser.id, TICKERS_KEY, CACHE_DATE)).toBeNull();
    expect(await findNewsSummaryCache(user.id, TICKERS_KEY, NEXT_CACHE_DATE)).toBeNull();
    expect(await findNewsSummaryCache(user.id, 'TSLA', CACHE_DATE)).toBeNull();
  });

  it('overwrites the cached summary when saved again for the same key', async () => {
    const user = await createTestUser();
    const replacement: NewsSummaryPayload = {
      holdingInsights: [],
      marketDrivers: [{ title: 'Rates', explanation: 'Rate expectations moved the market.' }],
    };
    await saveNewsSummaryCache({
      userId: user.id,
      tickersKey: TICKERS_KEY,
      summaryDate: CACHE_DATE,
      tickers: ['AAPL'],
      summaryPayload: NEWS_PAYLOAD,
    });

    await saveNewsSummaryCache({
      userId: user.id,
      tickersKey: TICKERS_KEY,
      summaryDate: CACHE_DATE,
      tickers: ['AAPL', 'MSFT'],
      summaryPayload: replacement,
    });

    const cached = await findNewsSummaryCache(user.id, TICKERS_KEY, CACHE_DATE);
    expect(cached?.tickers).toEqual(['AAPL', 'MSFT']);
    expect(cached?.summary_payload).toEqual(replacement);
  });

  it('refuses a cache row for a user that does not exist', async () => {
    const error = await captureDatabaseError(
      saveNewsSummaryCache({
        userId: UNKNOWN_USER_ID,
        tickersKey: TICKERS_KEY,
        summaryDate: CACHE_DATE,
        tickers: ['AAPL'],
        summaryPayload: NEWS_PAYLOAD,
      })
    );

    expect(error.code).toBe(POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION);
  });
});

describe('alignment explanation cache', () => {
  it('stores an explanation and tags it with the strategy', async () => {
    const user = await createTestUser();

    await saveAlignmentExplanationCache({
      userId: user.id,
      cacheKey: ALIGNMENT_CACHE_KEY,
      explanationDate: CACHE_DATE,
      strategyId: ALIGNMENT_STRATEGY_ID,
      payload: ALIGNMENT_PAYLOAD,
    });

    const cached = await findAlignmentExplanationCache(user.id, ALIGNMENT_CACHE_KEY, CACHE_DATE);

    expect(cached?.summary_payload).toEqual(ALIGNMENT_PAYLOAD);
    expect(cached?.tickers).toEqual([ALIGNMENT_STRATEGY_ID]);
    expect(
      await findAlignmentExplanationCache(user.id, ALIGNMENT_CACHE_KEY, NEXT_CACHE_DATE)
    ).toBeNull();
  });
});

describe('AI usage quota events', () => {
  it('counts events per user and feature since a point in time', async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const startOfWindow = new Date(Date.now() - MILLISECONDS_PER_DAY);

    await insertAiUsageEvent(user.id, NEWS_FEATURE);
    await insertAiUsageEvent(user.id, NEWS_FEATURE);
    await insertAiUsageEvent(user.id, CHAT_FEATURE);
    await insertAiUsageEvent(otherUser.id, NEWS_FEATURE);

    expect(await countAiUsageSince(user.id, NEWS_FEATURE, startOfWindow)).toBe(2);
    expect(await countAiUsageSince(user.id, CHAT_FEATURE, startOfWindow)).toBe(1);
    expect(await countAiUsageSince(otherUser.id, NEWS_FEATURE, startOfWindow)).toBe(1);
  });

  it('ignores events older than the window', async () => {
    const user = await createTestUser();
    await insertAiUsageEvent(user.id, NEWS_FEATURE);

    const afterTheEvent = new Date(Date.now() + MILLISECONDS_PER_DAY);

    expect(await countAiUsageSince(user.id, NEWS_FEATURE, afterTheEvent)).toBe(0);
  });

  it('accepts every feature the application defines', async () => {
    const user = await createTestUser();

    for (const feature of AI_FEATURES) {
      await expect(insertAiUsageEvent(user.id, feature)).resolves.toBeUndefined();
    }
  });

  it('rejects a feature the application does not define', async () => {
    const user = await createTestUser();

    const error = await captureDatabaseError(
      insertAiUsageEvent(user.id, UNSUPPORTED_FEATURE as AiFeatureId)
    );

    expect(error.constraint).toBe('ai_usage_events_feature_allowed_check');
  });
});
