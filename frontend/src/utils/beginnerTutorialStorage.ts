import {
  BEGINNER_TUTORIAL_COMPLETED_VALUE,
  BEGINNER_TUTORIAL_OPEN_EVENT,
  BEGINNER_TUTORIAL_STORAGE_KEY_PREFIX,
} from '../constants';

export function beginnerTutorialStorageKey(userId: string): string {
  return `${BEGINNER_TUTORIAL_STORAGE_KEY_PREFIX}${userId}`;
}

export function isBeginnerTutorialCompleted(userId: string): boolean {
  try {
    return (
      localStorage.getItem(beginnerTutorialStorageKey(userId)) === BEGINNER_TUTORIAL_COMPLETED_VALUE
    );
  } catch {
    return false;
  }
}

export function completeBeginnerTutorial(userId: string): void {
  try {
    localStorage.setItem(beginnerTutorialStorageKey(userId), BEGINNER_TUTORIAL_COMPLETED_VALUE);
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function resetBeginnerTutorial(userId: string): void {
  try {
    localStorage.removeItem(beginnerTutorialStorageKey(userId));
  } catch {
    // Ignore storage access errors.
  }
}

export function requestBeginnerTutorial(): void {
  window.dispatchEvent(new Event(BEGINNER_TUTORIAL_OPEN_EVENT));
}
