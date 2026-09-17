import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import {
  BEGINNER_TUTORIAL_BACK_LABEL,
  BEGINNER_TUTORIAL_DONE_LABEL,
  BEGINNER_TUTORIAL_NEXT_LABEL,
  BEGINNER_TUTORIAL_SKIP_LABEL,
  BEGINNER_TUTORIAL_START_LABEL,
  BEGINNER_TUTORIAL_STEPS,
} from '../../../content/beginnerTutorial';
import { BeginnerTutorialCard } from '../BeginnerTutorialCard';

function renderCard(
  stepIndex: number,
  handlers: Partial<{
    onStart: () => void;
    onSkip: () => void;
    onBack: () => void;
    onNext: () => void;
    onClose: () => void;
  }> = {}
) {
  return render(
    <BeginnerTutorialCard
      step={BEGINNER_TUTORIAL_STEPS[stepIndex]}
      stepIndex={stepIndex}
      cardRef={createRef<HTMLDivElement>()}
      position={{ top: 48, left: 48 }}
      onStart={handlers.onStart ?? jest.fn()}
      onSkip={handlers.onSkip ?? jest.fn()}
      onBack={handlers.onBack ?? jest.fn()}
      onNext={handlers.onNext ?? jest.fn()}
      onClose={handlers.onClose ?? jest.fn()}
    />
  );
}

describe('BeginnerTutorialCard', () => {
  it('asks whether to take the tour on the invite step', async () => {
    const user = userEvent.setup();
    const onStart = jest.fn();
    const onSkip = jest.fn();
    renderCard(0, { onStart, onSkip });

    expect(
      screen.getByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: BEGINNER_TUTORIAL_NEXT_LABEL })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_SKIP_LABEL }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_START_LABEL }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('walks coach steps with next, back, and done', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const onNext = jest.fn();
    const lastIndex = BEGINNER_TUTORIAL_STEPS.length - 1;

    const { rerender } = renderCard(1, { onBack, onNext });
    expect(
      screen.queryByRole('button', { name: BEGINNER_TUTORIAL_SKIP_LABEL })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: BEGINNER_TUTORIAL_BACK_LABEL })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_NEXT_LABEL }));
    expect(onNext).toHaveBeenCalledTimes(1);

    rerender(
      <BeginnerTutorialCard
        step={BEGINNER_TUTORIAL_STEPS[2]}
        stepIndex={2}
        cardRef={createRef<HTMLDivElement>()}
        position={{ top: 48, left: 48 }}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onBack={onBack}
        onNext={onNext}
        onClose={jest.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_BACK_LABEL }));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(
      <BeginnerTutorialCard
        step={BEGINNER_TUTORIAL_STEPS[lastIndex]}
        stepIndex={lastIndex}
        cardRef={createRef<HTMLDivElement>()}
        position={{ top: 48, left: 48 }}
        onStart={jest.fn()}
        onSkip={jest.fn()}
        onBack={onBack}
        onNext={onNext}
        onClose={jest.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_DONE_LABEL }));
    expect(onNext).toHaveBeenCalledTimes(2);
  });
});
