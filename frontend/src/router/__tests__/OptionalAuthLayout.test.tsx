import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LOADING_MESSAGES, ROUTES } from '../../constants';
import { apiGetMe } from '../../api/authApi';
import { authReducer } from '../../features/auth/authSlice';
import type { AuthState, AuthUser } from '../../types/auth.types';
import { FREE_SUBSCRIPTION_SUMMARY } from '../../types/billing.types';
import { OptionalAuthLayout } from '../OptionalAuthLayout';

jest.mock('../../api/authApi', () => ({
  ...jest.requireActual('../../api/authApi'),
  apiGetMe: jest.fn(() => new Promise(() => undefined)),
}));

jest.mock('../../components/layout', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>App shell{children}</div>,
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

function renderLayout(authState: AuthState) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[ROUTES.LEGAL]}>
        <Routes>
          <Route element={<OptionalAuthLayout />}>
            <Route path={ROUTES.LEGAL} element={<p>Legal public content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('OptionalAuthLayout', () => {
  beforeEach(() => {
    jest.mocked(apiGetMe).mockClear();
  });

  it('shows a session loader while restoring a possible cookie session', () => {
    renderLayout(idleAuthState);

    expect(apiGetMe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: LOADING_MESSAGES.SESSION })).toBeInTheDocument();
    expect(screen.queryByText('Legal public content')).not.toBeInTheDocument();
  });

  it('renders public chrome for anonymous visitors', () => {
    renderLayout({ ...idleAuthState, isInitialized: true });

    expect(apiGetMe).not.toHaveBeenCalled();
    expect(screen.getByText('Legal public content')).toBeInTheDocument();
    expect(screen.queryByText('App shell')).not.toBeInTheDocument();
  });

  it('keeps signed-in users inside the app shell', () => {
    renderLayout({ ...idleAuthState, isInitialized: true, user: testUser });

    expect(apiGetMe).not.toHaveBeenCalled();
    expect(screen.getByText('App shell')).toBeInTheDocument();
    expect(screen.getByText('Legal public content')).toBeInTheDocument();
  });
});
