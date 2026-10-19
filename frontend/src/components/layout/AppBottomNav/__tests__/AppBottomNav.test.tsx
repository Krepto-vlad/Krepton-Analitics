import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ROUTES } from '../../../../constants';
import { apiLogout } from '../../../../api/authApi';
import { renderWithProviders, testUser } from '../../../../__tests__/renderWithProviders';
import { AppBottomNav } from '../AppBottomNav';

jest.mock('../../../../api/authApi', () => ({
  ...jest.requireActual('../../../../api/authApi'),
  apiLogout: jest.fn(),
}));

function renderNav(route: string = ROUTES.DASHBOARD) {
  return renderWithProviders(
    <>
      <AppBottomNav />
      <Routes>
        <Route path={ROUTES.DASHBOARD} element={<p>Dashboard page</p>} />
        <Route path={ROUTES.NEWS} element={<p>News page</p>} />
        <Route path={ROUTES.REBALANCING} element={<p>Rebalancing page</p>} />
        <Route path={ROUTES.LOGIN} element={<p>Login page</p>} />
      </Routes>
    </>,
    {
      route,
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
}

describe('AppBottomNav', () => {
  it('opens the news page from the primary tab', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('link', { name: 'News' }));
    expect(screen.getByText('News page')).toBeInTheDocument();
  });

  it('opens secondary pages from the more menu and logs out', async () => {
    const user = userEvent.setup();
    jest.mocked(apiLogout).mockResolvedValue(undefined);
    renderNav(ROUTES.NEWS);

    expect(screen.queryByRole('dialog', { name: 'More pages' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog', { name: 'More pages' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Rebalancing' }));
    expect(screen.getByText('Rebalancing page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'More pages' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More' }));
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(apiLogout).toHaveBeenCalled();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
