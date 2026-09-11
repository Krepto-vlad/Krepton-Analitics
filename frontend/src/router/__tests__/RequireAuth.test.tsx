import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LOADING_MESSAGES, ROUTES } from '../../constants';
import { apiGetMe } from '../../api/authApi';
import { authReducer } from '../../features/auth/authSlice';
import type { AuthState, AuthUser } from '../../types/auth.types';
import { FREE_SUBSCRIPTION_SUMMARY } from '../../types/billing.types';
import { RequireAuth } from '../RequireAuth';

jest.mock('../../api/authApi', () => ({
  ...jest.requireActual('../../api/authApi'),
  apiGetMe: jest.fn(() => new Promise(() => undefined)),
}));

const testUser: AuthUser = {
  id: 'user-1',
  email: 'investor@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  isAdmin: false,
  subscription: FREE_SUBSCRIPTION_SUMMARY,
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
};

const idleAuthState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  pendingVerificationEmail: null,
  infoMessage: null,
};

function renderGuard(authState: AuthState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<p>Login page</p>} />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <RequireAuth>
                <p>Protected dashboard</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    jest.mocked(apiGetMe).mockClear();
  });

  it('shows a session loader and restores the session on protected routes', () => {
    renderGuard(idleAuthState);

    expect(apiGetMe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: LOADING_MESSAGES.SESSION })).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects anonymous users to login', () => {
    renderGuard({ ...idleAuthState, isInitialized: true });

    expect(apiGetMe).not.toHaveBeenCalled();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });

  it('renders protected content for an authenticated user', () => {
    renderGuard({ ...idleAuthState, isInitialized: true, user: testUser });

    expect(apiGetMe).not.toHaveBeenCalled();
    expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
