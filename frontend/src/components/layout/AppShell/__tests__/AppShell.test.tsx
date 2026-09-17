import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../../constants';
import { renderWithProviders, testUser } from '../../../../__tests__/renderWithProviders';
import { AppShell } from '../AppShell';

jest.mock('../../AppSidebar/AppSidebar', () => ({
  AppSidebar: ({ onExpandedChange }: { onExpandedChange: (expanded: boolean) => void }) => (
    <button type="button" onClick={() => onExpandedChange(true)}>
      Expand sidebar
    </button>
  ),
}));

jest.mock('../../AppHeader/AppHeader', () => ({
  AppHeader: ({
    onCurrencyChange,
    onThemeToggle,
  }: {
    onCurrencyChange: (currency: 'USD' | 'EUR') => void;
    onThemeToggle: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onCurrencyChange('EUR')}>
        EUR
      </button>
      <button type="button" onClick={onThemeToggle}>
        Toggle theme
      </button>
    </div>
  ),
}));

jest.mock('../../../../hooks/usePortfolioCurrencyRefresh', () => ({
  usePortfolioCurrencyRefresh: jest.fn(),
}));

jest.mock('../../../tutorial/BeginnerTutorialHost', () => ({
  BeginnerTutorialHost: () => null,
}));

describe('AppShell', () => {
  it('forwards currency and theme changes from the header', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(
      <AppShell>
        <p>Shell children</p>
      </AppShell>,
      {
        route: ROUTES.DASHBOARD,
        preloadedState: {
          auth: {
            user: testUser,
            isLoading: false,
            error: null,
            isInitialized: true,
            pendingVerificationEmail: null,
            infoMessage: null,
          },
        },
      }
    );

    expect(screen.getByText('Shell children')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    await user.click(screen.getByRole('button', { name: 'EUR' }));
    expect(store.getState().ui.currency).toBe('EUR');
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
  });
});
