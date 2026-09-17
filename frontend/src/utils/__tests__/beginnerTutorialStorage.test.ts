import { BEGINNER_TUTORIAL_STORAGE_KEY_PREFIX } from '../../constants';
import {
  beginnerTutorialStorageKey,
  completeBeginnerTutorial,
  isBeginnerTutorialCompleted,
  resetBeginnerTutorial,
} from '../beginnerTutorialStorage';

describe('beginnerTutorialStorage', () => {
  const userId = 'user-1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('stores completion per user id', () => {
    expect(isBeginnerTutorialCompleted(userId)).toBe(false);
    completeBeginnerTutorial(userId);
    expect(isBeginnerTutorialCompleted(userId)).toBe(true);
    expect(localStorage.getItem(beginnerTutorialStorageKey(userId))).toBe('completed');
    expect(
      beginnerTutorialStorageKey(userId).startsWith(BEGINNER_TUTORIAL_STORAGE_KEY_PREFIX)
    ).toBe(true);
    expect(isBeginnerTutorialCompleted('user-2')).toBe(false);
  });

  it('resets completion so the tour can replay', () => {
    completeBeginnerTutorial(userId);
    resetBeginnerTutorial(userId);
    expect(isBeginnerTutorialCompleted(userId)).toBe(false);
  });
});
