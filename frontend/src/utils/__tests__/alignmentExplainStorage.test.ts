import { AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY } from '../../constants';
import type { AlignmentExplanationResponse } from '../../types/ai.types';
import {
  clearPersistedAlignmentExplanation,
  loadPersistedAlignmentExplanation,
  savePersistedAlignmentExplanation,
} from '../alignmentExplainStorage';

function todayIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

const explanation: AlignmentExplanationResponse = {
  explanationDate: todayIsoDate(),
  strategyId: 'core',
  strategyName: 'Core 60/40',
  alignmentScore: 80,
  overview: 'Close to target.',
  keyDrifts: [{ title: 'Equities', explanation: 'Slightly overweight' }],
  whatItMeans: 'Stay the course.',
  disclaimer: 'Not advice.',
  fromCache: false,
  quota: { used: 1, limit: 10, remaining: 9, resetsAt: '2026-09-09T00:00:00.000Z' },
};

describe('alignmentExplainStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadPersistedAlignmentExplanation('core', 80)).toBeNull();
  });

  it('round-trips a same-day explanation for the same strategy and score', () => {
    savePersistedAlignmentExplanation('core', 80.4, explanation);
    expect(loadPersistedAlignmentExplanation('core', 80)).toEqual(explanation);
  });

  it('drops stale or mismatched persisted state', () => {
    savePersistedAlignmentExplanation('core', 80, explanation);
    expect(loadPersistedAlignmentExplanation('income', 80)).toBeNull();
    expect(sessionStorage.getItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears storage and ignores invalid JSON', () => {
    sessionStorage.setItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY, '{not-json');
    expect(loadPersistedAlignmentExplanation('core', 80)).toBeNull();
    savePersistedAlignmentExplanation('core', 80, explanation);
    clearPersistedAlignmentExplanation();
    expect(loadPersistedAlignmentExplanation('core', 80)).toBeNull();
  });
});
