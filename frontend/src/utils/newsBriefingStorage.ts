import { AI_NEWS_BRIEFING_SESSION_STORAGE_KEY } from '../constants';
import type { NewsSummaryResponse } from '../types/ai.types';

export interface PersistedNewsBriefingState {
  holdingsKey: string;
  selectedTickers: string[];
  includePortfolioContext: boolean;
  summary: NewsSummaryResponse;
}

function getLocalTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPersistedStateValid(
  state: PersistedNewsBriefingState,
  holdingsKey: string,
  availableTickers: string[]
): boolean {
  if (state.holdingsKey !== holdingsKey) {
    return false;
  }

  if (state.summary.summaryDate !== getLocalTodayIsoDate()) {
    return false;
  }

  const availableTickerSet = new Set(availableTickers.map((ticker) => ticker.toUpperCase()));
  return state.selectedTickers.every((ticker) => availableTickerSet.has(ticker.toUpperCase()));
}

export function loadPersistedNewsBriefing(
  holdingsKey: string,
  availableTickers: string[]
): PersistedNewsBriefingState | null {
  try {
    const rawValue = sessionStorage.getItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as PersistedNewsBriefingState;
    if (!parsed?.summary || !Array.isArray(parsed.selectedTickers)) {
      return null;
    }

    if (!isPersistedStateValid(parsed, holdingsKey, availableTickers)) {
      sessionStorage.removeItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY);
    return null;
  }
}

export function savePersistedNewsBriefing(state: PersistedNewsBriefingState): void {
  try {
    sessionStorage.setItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function clearPersistedNewsBriefing(): void {
  sessionStorage.removeItem(AI_NEWS_BRIEFING_SESSION_STORAGE_KEY);
}
