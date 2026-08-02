import { AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY } from '../constants';
import type { AlignmentExplanationResponse } from '../types/ai.types';

export interface PersistedAlignmentExplanationState {
  strategyId: string;
  alignmentScore: number;
  explanation: AlignmentExplanationResponse;
}

function getLocalTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadPersistedAlignmentExplanation(
  strategyId: string,
  alignmentScore: number
): AlignmentExplanationResponse | null {
  try {
    const rawValue = sessionStorage.getItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as PersistedAlignmentExplanationState;
    if (!parsed?.explanation) {
      return null;
    }

    if (
      parsed.strategyId !== strategyId ||
      Math.round(parsed.alignmentScore) !== Math.round(alignmentScore) ||
      parsed.explanation.explanationDate !== getLocalTodayIsoDate()
    ) {
      sessionStorage.removeItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed.explanation;
  } catch {
    sessionStorage.removeItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY);
    return null;
  }
}

export function savePersistedAlignmentExplanation(
  strategyId: string,
  alignmentScore: number,
  explanation: AlignmentExplanationResponse
): void {
  try {
    const state: PersistedAlignmentExplanationState = {
      strategyId,
      alignmentScore: Math.round(alignmentScore),
      explanation,
    };
    sessionStorage.setItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function clearPersistedAlignmentExplanation(): void {
  sessionStorage.removeItem(AI_ALIGNMENT_EXPLAIN_SESSION_STORAGE_KEY);
}
