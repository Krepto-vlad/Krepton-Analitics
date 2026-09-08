import { configureStore } from '@reduxjs/toolkit';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { authReducer } from '../features/auth/authSlice';
import { livePollingReducer } from '../features/livePolling/livePollingSlice';
import { portfolioReducer } from '../features/portfolio/portfolioSlice';
import { tickerReducer } from '../features/ticker/tickerSlice';
import { uiReducer } from '../features/ui/uiSlice';
import { watchlistReducer } from '../features/watchlist/watchlistSlice';
import type { AuthUser } from '../types/auth.types';
import type { RootState } from '../store';

const rootReducer = {
  auth: authReducer,
  portfolio: portfolioReducer,
  watchlist: watchlistReducer,
  livePolling: livePollingReducer,
  ticker: tickerReducer,
  ui: uiReducer,
};

export const testUser: AuthUser = {
  id: 'user-1',
  email: 'investor@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
};

export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
  });
}

interface RenderWithProvidersOptions {
  store?: ReturnType<typeof createTestStore>;
  route?: string;
  preloadedState?: Partial<RootState>;
  renderOptions?: Omit<RenderOptions, 'wrapper'>;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const store = options.store ?? createTestStore(options.preloadedState);
  const route = options.route ?? '/';

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...options.renderOptions }),
  };
}
