import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ROUTES } from '../../../../constants';
import { createTestStore, testUser } from '../../../../__tests__/renderWithProviders';
import { Navbar } from '../Navbar';

function renderNavbar(path = ROUTES.HOME) {
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

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={ROUTES.HOME} element={<Navbar activeRoute="home" />} />
          <Route path={ROUTES.PRICING} element={<Navbar activeRoute="pricing" />} />
          <Route path={ROUTES.LOGIN} element={<p>Login</p>} />
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
});
