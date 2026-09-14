import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ROUTES } from '../../../../constants';
import { createTestStore, testUser } from '../../../../__tests__/renderWithProviders';
import type { AuthUser } from '../../../../types/auth.types';
import { Navbar } from '../Navbar';

function renderNavbar(path = ROUTES.HOME, user: AuthUser | null = null) {
  const store = createTestStore({
    auth: {
      user,
      isLoading: false,
      error: null,
      isInitialized: true,
      pendingVerificationEmail: null,
      infoMessage: null,
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={ROUTES.HOME} element={<Navbar activeRoute="home" />} />
          <Route path={ROUTES.PRICING} element={<Navbar activeRoute="pricing" />} />
          <Route path={ROUTES.LOGIN} element={<p>Login</p>} />
          <Route path={ROUTES.DASHBOARD} element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('Navbar', () => {
  it('toggles the mobile menu and theme', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /theme/i })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Features' })[0]);
  });

  it('sends a signed-in visitor back to the app instead of Sign In', async () => {
    const user = userEvent.setup();
    renderNavbar(ROUTES.HOME, testUser);

    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open app' })).toHaveAttribute(
      'href',
      ROUTES.DASHBOARD
    );
    expect(screen.getByRole('link', { name: /Krepton/i })).toHaveAttribute(
      'href',
      ROUTES.DASHBOARD
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('link', { name: 'Open app' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Get Started Free')).not.toBeInTheDocument();
  });
});
