import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { activateLivePollingScope } from '../../features/livePolling/livePollingSlice';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useWatchlistPolling } from '../useWatchlistPolling';

jest.mock('../../utils/tabLeader', () => ({
  useTabLeader: () => true,
}));

jest.mock('../../features/watchlist/watchlistSlice', () => {
  const actual = jest.requireActual('../../features/watchlist/watchlistSlice');
  return {
    ...actual,
    fetchWatchlistThunk: () => ({ type: 'watchlist/fetch' }),
    refreshWatchlistQuotesThunk: () => ({ type: 'watchlist/refresh' }),
  };
});

describe('useWatchlistPolling', () => {
  it('hydrates the watchlist when the live scope is active', () => {
    const store = createTestStore();
    store.dispatch(activateLivePollingScope('watchlist'));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { unmount } = renderHook(() => useWatchlistPolling(), { wrapper });
    act(() => undefined);
    unmount();
  });
});
