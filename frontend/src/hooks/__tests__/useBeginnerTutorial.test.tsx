import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { BEGINNER_TUTORIAL_OPEN_EVENT } from '../../constants';
import { createTestStore, testUser } from '../../__tests__/renderWithProviders';
import { completeBeginnerTutorial } from '../../utils/beginnerTutorialStorage';
import { useBeginnerTutorialController } from '../useBeginnerTutorial';

function wrapperWithUser(completed: boolean) {
  if (completed) {
    completeBeginnerTutorial(testUser.id);
  }

  const store = createTestStore({
    auth: {
      user: testUser,
      isLoading: false,
      error: null,
      isInitialized: true,
      pendingVerificationEmail: null,
      infoMessage: null,
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('useBeginnerTutorialController', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens for a signed-in user who has not finished the tour', () => {
    const { result } = renderHook(() => useBeginnerTutorialController(), {
      wrapper: wrapperWithUser(false),
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('stays closed when the tour is already completed', () => {
    const { result } = renderHook(() => useBeginnerTutorialController(), {
      wrapper: wrapperWithUser(true),
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('starts the coach tour from the invite', () => {
    const { result } = renderHook(() => useBeginnerTutorialController(), {
      wrapper: wrapperWithUser(false),
    });

    act(() => {
      result.current.startTour();
    });
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.currentStep?.kind).toBe('coach');
  });

  it('reopens on a replay event after the user skipped', () => {
    const { result } = renderHook(() => useBeginnerTutorialController(), {
      wrapper: wrapperWithUser(false),
    });

    act(() => {
      result.current.completeAndClose();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      window.dispatchEvent(new Event(BEGINNER_TUTORIAL_OPEN_EVENT));
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });
});
