import { AI_NEWS_BRIEFING_SESSION_STORAGE_KEY } from '../../constants';
import type { NewsSummaryResponse } from '../../types/ai.types';
import {
  clearPersistedNewsBriefing,
  loadPersistedNewsBriefing,
  savePersistedNewsBriefing,
} from '../newsBriefingStorage';

function todayIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

const summary: NewsSummaryResponse = {
  summaryDate: todayIsoDate(),
  tickers: ['AAPL'],
  holdingInsights: [],
  marketDrivers: [],
  sources: [],
  disclaimer: 'Not advice.',
  fromCache: false,
  quota: { used: 1, limit: 10, remaining: 9, resetsAt: '2026-09-09T00:00:00.000Z' },
  groundingEnabled: false,
  includePortfolioContext: false,
};

describe('newsBriefingStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadPersistedNewsBriefing('AAPL:1', ['AAPL'])).toBeNull();
  });

  it('round-trips a same-day briefing for the same holdings', () => {
    savePersistedNewsBriefing({
      holdingsKey: 'AAPL:1',
      selectedTickers: ['AAPL'],
      includePortfolioContext: false,
      summary,
    });

    expect(loadPersistedNewsBriefing('AAPL:1', ['AAPL', 'MSFT'])?.summary).toEqual(summary);
  });

  it('drops briefings whose tickers are no longer available', () => {
    savePersistedNewsBriefing({
      holdingsKey: 'AAPL:1',
      selectedTickers: ['AAPL'],
      includePortfolioContext: false,
      summary,
    });

    expect(loadPersistedNewsBriefing('AAPL:1', ['MSFT'])).toBeNull();
    expect(sessionStorage.getItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears invalid JSON', () => {
    sessionStorage.setItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY, '{bad');
    expect(loadPersistedNewsBriefing('AAPL:1', ['AAPL'])).toBeNull();
    savePersistedNewsBriefing({
      holdingsKey: 'AAPL:1',
      selectedTickers: ['AAPL'],
      includePortfolioContext: false,
      summary,
    });
    clearPersistedNewsBriefing();
    expect(loadPersistedNewsBriefing('AAPL:1', ['AAPL'])).toBeNull();
  });
});
