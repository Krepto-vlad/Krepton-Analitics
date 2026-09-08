import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { activateLivePollingScope } from '../../features/livePolling/livePollingSlice';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useDashboardLivePollingScopes, useLivePollingScope } from '../useLivePollingScope';

describe('useLivePollingScope', () => {
  it('activates and deactivates a scope', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { unmount } = renderHook(() => useLivePollingScope('holdings'), { wrapper });
    expect(store.getState().livePolling.scopes.holdings).toBe(1);
    unmount();
    expect(store.getState().livePolling.scopes.holdings).toBe(0);
  });

  it('registers both dashboard scopes', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { unmount } = renderHook(() => useDashboardLivePollingScopes(), { wrapper });
    expect(store.getState().livePolling.scopes.holdings).toBe(1);
    expect(store.getState().livePolling.scopes.watchlist).toBe(1);
    unmount();
    expect(store.getState().livePolling.scopes.holdings).toBe(0);
    expect(activateLivePollingScope).toBeDefined();
  });

  it('does nothing when the scope is null', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    renderHook(() => useLivePollingScope(null), { wrapper });
    expect(store.getState().livePolling.scopes.holdings).toBe(0);
  });
});
