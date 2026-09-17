import { type RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import {
  BEGINNER_TUTORIAL_BACK_LABEL,
  BEGINNER_TUTORIAL_CLOSE_LABEL,
  BEGINNER_TUTORIAL_DIALOG_LABEL,
  BEGINNER_TUTORIAL_DONE_LABEL,
  BEGINNER_TUTORIAL_NEXT_LABEL,
  BEGINNER_TUTORIAL_PROGRESS_LABEL,
  BEGINNER_TUTORIAL_SKIP_LABEL,
  BEGINNER_TUTORIAL_START_LABEL,
  BEGINNER_TUTORIAL_STEPS,
  BEGINNER_TUTORIAL_TITLE_ID,
  type BeginnerTutorialStep,
} from '../../content/beginnerTutorial';
import styles from './BeginnerTutorialCard.module.scss';

interface BeginnerTutorialCardProps {
  step: BeginnerTutorialStep;
  stepIndex: number;
  cardRef: RefObject<HTMLDivElement | null>;
  position: { top: number; left: number };
  onStart: () => void;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function BeginnerTutorialCard({
  step,
  stepIndex,
  cardRef,
  position,
  onStart,
  onSkip,
  onBack,
  onNext,
  onClose,
}: BeginnerTutorialCardProps) {
  const isInvite = step.kind === 'invite';
  const isFirstCoach = step.kind === 'coach' && stepIndex === 1;
  const isLastCoach = stepIndex === BEGINNER_TUTORIAL_STEPS.length - 1;
  const coachCount = BEGINNER_TUTORIAL_STEPS.length - 1;
  const coachNumber = step.kind === 'coach' ? stepIndex : 0;

  return (
    <div
      ref={cardRef}
      className={styles.card}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-modal="false"
      aria-labelledby={BEGINNER_TUTORIAL_TITLE_ID}
      aria-label={BEGINNER_TUTORIAL_DIALOG_LABEL}
    >
      <div className={styles.header}>
        <div>
          {step.kind === 'coach' && (
            <p className={styles.kicker}>
              {BEGINNER_TUTORIAL_PROGRESS_LABEL} {coachNumber} / {coachCount}
            </p>
          )}
          <h2 id={BEGINNER_TUTORIAL_TITLE_ID} className={styles.title}>
            {step.title}
          </h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label={BEGINNER_TUTORIAL_CLOSE_LABEL}
        >
          <X size={16} />
        </button>
      </div>

      <p className={styles.body}>{step.body}</p>

      <div className={styles.actions}>
        {isInvite ? (
          <>
            <Button type="button" variant="ghost" onClick={onSkip}>
              {BEGINNER_TUTORIAL_SKIP_LABEL}
            </Button>
            <Button type="button" variant="primary" onClick={onStart}>
              {BEGINNER_TUTORIAL_START_LABEL}
            </Button>
          </>
        ) : (
          <>
            {!isFirstCoach && (
              <Button type="button" variant="outline" onClick={onBack}>
                {BEGINNER_TUTORIAL_BACK_LABEL}
              </Button>
            )}
            <Button type="button" variant="primary" onClick={onNext}>
              {isLastCoach ? BEGINNER_TUTORIAL_DONE_LABEL : BEGINNER_TUTORIAL_NEXT_LABEL}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
