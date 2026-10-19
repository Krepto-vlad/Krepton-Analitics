import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildTickerDetailPath, ROUTES } from '../../../../constants';
import { renderWithProviders, testUser } from '../../../../__tests__/renderWithProviders';
import { AppHeader } from '../AppHeader';

jest.mock('../HeaderTickerSearch', () => ({
  HeaderTickerSearch: () => <div>Ticker search</div>,
}));

describe('AppHeader', () => {
  it('shows the page title, switches currency, and toggles theme', async () => {
    const user = userEvent.setup();
    const onCurrencyChange = jest.fn();
    const onThemeToggle = jest.fn();

    renderWithProviders(
      <AppHeader
        currency="USD"
        onCurrencyChange={onCurrencyChange}
        isSidebarExpanded
        theme="dark"
        onThemeToggle={onThemeToggle}
      />,
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

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Ticker search')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'EUR' }));
    expect(onCurrencyChange).toHaveBeenCalledWith('EUR');
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(onThemeToggle).toHaveBeenCalled();
  });

  it('titles the news page and a ticker route', () => {
    const { unmount } = renderWithProviders(
      <AppHeader
        currency="USD"
        onCurrencyChange={jest.fn()}
        isSidebarExpanded={false}
        theme="dark"
        onThemeToggle={jest.fn()}
      />,
      { route: ROUTES.NEWS }
    );

    expect(screen.getByRole('heading', { name: 'News' })).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <AppHeader
        currency="USD"
        onCurrencyChange={jest.fn()}
        isSidebarExpanded={false}
        theme="dark"
        onThemeToggle={jest.fn()}
      />,
      { route: buildTickerDetailPath('msft') }
    );

    expect(screen.getByRole('heading', { name: 'MSFT' })).toBeInTheDocument();
  });
});
