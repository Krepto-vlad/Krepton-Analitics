import { useEffect, useState } from 'react';
import { BEGINNER_TUTORIAL_OPEN_EVENT } from '../constants';
import {
  BEGINNER_TUTORIAL_FIRST_COACH_STEP_INDEX,
  BEGINNER_TUTORIAL_INVITE_STEP_INDEX,
  BEGINNER_TUTORIAL_STEPS,
  type BeginnerTutorialStep,
} from '../content/beginnerTutorial';
import {
  completeBeginnerTutorial,
  isBeginnerTutorialCompleted,
} from '../utils/beginnerTutorialStorage';
import { useAppSelector } from './useAppSelector';

export interface BeginnerTutorialController {
  isOpen: boolean;
  stepIndex: number;
  currentStep: BeginnerTutorialStep | undefined;
  setStepIndex: (stepIndex: number) => void;
  startTour: () => void;
  completeAndClose: () => void;
}

export function useBeginnerTutorialController(): BeginnerTutorialController {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [isOpen, setIsOpen] = useState(() =>
    userId ? !isBeginnerTutorialCompleted(userId) : false
  );
  const [stepIndex, setStepIndex] = useState(BEGINNER_TUTORIAL_INVITE_STEP_INDEX);
  const currentStep = BEGINNER_TUTORIAL_STEPS[stepIndex];

  useEffect(() => {
    function handleOpenRequest(): void {
      setStepIndex(BEGINNER_TUTORIAL_INVITE_STEP_INDEX);
      setIsOpen(true);
    }

    window.addEventListener(BEGINNER_TUTORIAL_OPEN_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener(BEGINNER_TUTORIAL_OPEN_EVENT, handleOpenRequest);
    };
  }, []);

  function startTour(): void {
    setStepIndex(BEGINNER_TUTORIAL_FIRST_COACH_STEP_INDEX);
  }

  function completeAndClose(): void {
    if (userId) {
      completeBeginnerTutorial(userId);
    }
    setIsOpen(false);
  }

  return {
    isOpen,
    stepIndex,
    currentStep,
    setStepIndex,
    startTour,
    completeAndClose,
  };
}
