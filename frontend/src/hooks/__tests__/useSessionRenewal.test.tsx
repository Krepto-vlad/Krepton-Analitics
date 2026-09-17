import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { SESSION_ACTIVITY_THROTTLE_MS, SESSION_RENEW_REMAINING_MS } from '../../constants';
import { extendSessionThunk } from '../../features/auth/authSlice';
import { createTestStore, testUser } from '../../__tests__/renderWithProviders';
import { useSessionRenewal } from '../useSessionRenewal';

jest.mock('../../features/auth/authSlice', () => {
  const actual = jest.requireActual('../../features/auth/authSlice');
  return {
    ...actual,
    extendSessionThunk: jest.fn(() => ({ type: 'auth/extendSession' })),
  };
});

function renderSessionRenewal(sessionExpiresAt: string) {
  const store = createTestStore({
    auth: {
      user: {
        ...testUser,
        sessionExpiresAt,
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

  return renderHook(() => useSessionRenewal(), { wrapper });
}

describe('useSessionRenewal', () => {
  const originalVisibility = document.visibilityState;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(extendSessionThunk).mockClear();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: originalVisibility,
    });
    jest.useRealTimers();
  });

  it('renews automatically when remaining time is already short', () => {
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS / 2).toISOString());
    expect(extendSessionThunk).toHaveBeenCalledTimes(1);
  });

  it('renews when the sliding window is reached without user input', () => {
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS + 5_000).toISOString());
    expect(extendSessionThunk).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(extendSessionThunk).toHaveBeenCalledTimes(1);
  });

  it('does not renew while the tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS / 2).toISOString());
    expect(extendSessionThunk).not.toHaveBeenCalled();
  });

  it('renews when the tab becomes visible inside the sliding window', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS / 2).toISOString());

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(extendSessionThunk).toHaveBeenCalledTimes(1);
  });

  it('does not renew on activity while more than half of the TTL remains', () => {
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS + 60_000).toISOString());
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(extendSessionThunk).not.toHaveBeenCalled();
  });

  it('retries after the activity throttle while still inside the sliding window', () => {
    renderSessionRenewal(new Date(Date.now() + SESSION_RENEW_REMAINING_MS / 2).toISOString());
    expect(extendSessionThunk).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(SESSION_ACTIVITY_THROTTLE_MS);
    });
    expect(extendSessionThunk).toHaveBeenCalledTimes(2);
  });
});
