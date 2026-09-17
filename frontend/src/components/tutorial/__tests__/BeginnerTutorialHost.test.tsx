import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../constants';
import {
  BEGINNER_TUTORIAL_SKIP_LABEL,
  BEGINNER_TUTORIAL_START_LABEL,
  BEGINNER_TUTORIAL_STEPS,
} from '../../../content/beginnerTutorial';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { prefetchBeginnerTutorialTicker } from '../../../utils/prefetchBeginnerTutorialTicker';
import { BeginnerTutorialProvider } from '../BeginnerTutorialContext';
import { BeginnerTutorialHost } from '../BeginnerTutorialHost';

jest.mock('../../../utils/prefetchBeginnerTutorialTicker', () => ({
  prefetchBeginnerTutorialTicker: jest.fn(),
}));

const signedInState = {
  auth: {
    user: testUser,
    isLoading: false,
    error: null,
    isInitialized: true,
    pendingVerificationEmail: null,
    infoMessage: null,
  },
} as const;

function renderHost() {
  return renderWithProviders(
    <BeginnerTutorialProvider>
      <BeginnerTutorialHost />
    </BeginnerTutorialProvider>,
    {
      route: ROUTES.DASHBOARD,
      preloadedState: signedInState,
    }
  );
}

describe('BeginnerTutorialHost', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(prefetchBeginnerTutorialTicker).mockClear();
  });

  it('prefetches the sample ticker while the tour is open', async () => {
    renderHost();

    expect(prefetchBeginnerTutorialTicker).toHaveBeenCalled();
    expect(
      await screen.findByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).toBeInTheDocument();
  });

  it('asks to take the tour, and skip closes it for later visits', async () => {
    const user = userEvent.setup();
    const { unmount } = renderHost();

    expect(
      await screen.findByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_SKIP_LABEL }));
    expect(
      screen.queryByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).not.toBeInTheDocument();

    unmount();
    renderHost();
    expect(
      screen.queryByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[0].title })
    ).not.toBeInTheDocument();
  });

  it('starts the UI tour from the invite', async () => {
    const user = userEvent.setup();
    renderHost();

    await user.click(screen.getByRole('button', { name: BEGINNER_TUTORIAL_START_LABEL }));
    expect(
      await screen.findByRole('heading', { name: BEGINNER_TUTORIAL_STEPS[1].title })
    ).toBeInTheDocument();
  });
});
