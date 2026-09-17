import { createContext, useContext, type ReactNode } from 'react';
import {
  useBeginnerTutorialController,
  type BeginnerTutorialController,
} from '../../hooks/useBeginnerTutorial';

const BeginnerTutorialContext = createContext<BeginnerTutorialController | null>(null);

interface BeginnerTutorialProviderProps {
  children: ReactNode;
}

export function BeginnerTutorialProvider({ children }: BeginnerTutorialProviderProps) {
  const value = useBeginnerTutorialController();
  return (
    <BeginnerTutorialContext.Provider value={value}>{children}</BeginnerTutorialContext.Provider>
  );
}

const INACTIVE_TUTORIAL: BeginnerTutorialController = {
  isOpen: false,
  stepIndex: 0,
  currentStep: undefined,
  setStepIndex: () => undefined,
  startTour: () => undefined,
  completeAndClose: () => undefined,
};

/* eslint-disable react-refresh/only-export-components -- hook is the public context API */
export function useBeginnerTutorial(): BeginnerTutorialController {
  return useContext(BeginnerTutorialContext) ?? INACTIVE_TUTORIAL;
}
