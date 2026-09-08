import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { SESSION_RENEW_REMAINING_MS } from '../../constants';
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

describe('useSessionRenewal', () => {
  it('renews the session on pointer activity when remaining time is short', () => {
    const store = createTestStore({
      auth: {
        user: {
          ...testUser,
          sessionExpiresAt: new Date(Date.now() + SESSION_RENEW_REMAINING_MS / 2).toISOString(),
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

    renderHook(() => useSessionRenewal(), { wrapper });
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(extendSessionThunk).toHaveBeenCalled();
  });
});
