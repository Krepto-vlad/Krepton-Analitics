import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { SESSION_EXPIRY_SKEW_MS } from '../../constants';
import { expireClientSession } from '../../features/auth/expireClientSession';
import { createTestStore, testUser } from '../../__tests__/renderWithProviders';
import { useSessionExpiry } from '../useSessionExpiry';

jest.mock('../../features/auth/expireClientSession', () => ({
  expireClientSession: jest.fn(),
}));

describe('useSessionExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('expires immediately when the session is already past due', () => {
    const store = createTestStore({
      auth: {
        user: { ...testUser, sessionExpiresAt: new Date(Date.now() - 10_000).toISOString() },
        isLoading: false,
        error: null,
        isInitialized: true,
        pendingVerificationEmail: null,
        infoMessage: null,
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSessionExpiry(), { wrapper });
    expect(expireClientSession).toHaveBeenCalled();
  });

  it('schedules expiry for a future session', () => {
    const store = createTestStore({
      auth: {
        user: {
          ...testUser,
          sessionExpiresAt: new Date(Date.now() + SESSION_EXPIRY_SKEW_MS + 5_000).toISOString(),
        },
        isLoading: false,
        error: null,
        isInitialized: true,
        pendingVerificationEmail: null,
        infoMessage: null,
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useSessionExpiry(), { wrapper });
    expect(expireClientSession).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(SESSION_EXPIRY_SKEW_MS + 5_000);
    });
    expect(expireClientSession).toHaveBeenCalled();
  });
});
