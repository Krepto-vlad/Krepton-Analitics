import { configureStore } from '@reduxjs/toolkit';
import {
  apiExtendSession,
  apiGetMe,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiRegister,
  apiResendVerification,
  apiVerifyEmail,
} from '../../../api/authApi';
import type { AuthUser } from '../../../types/auth.types';
import type { AppDispatch } from '../../../store';
import { expireClientSession } from '../expireClientSession';
import {
  authReducer,
  clearAuthError,
  clearAuthInfoMessage,
  expireSession,
  extendSessionThunk,
  fetchCurrentUserThunk,
  googleLoginThunk,
  loginThunk,
  logoutThunk,
  registerThunk,
  resendVerificationThunk,
  verifyEmailThunk,
} from '../authSlice';

jest.mock('../../../api/authApi', () => ({
  apiRegister: jest.fn(),
  apiLogin: jest.fn(),
  apiGoogleLogin: jest.fn(),
  apiVerifyEmail: jest.fn(),
  apiResendVerification: jest.fn(),
  apiLogout: jest.fn(),
  apiGetMe: jest.fn(),
  apiExtendSession: jest.fn(),
}));

jest.mock('../../../utils/strategyDriftAlertStorage', () => ({
  clearStrategyDriftAlertDismissal: jest.fn(),
}));

const user: AuthUser = {
  id: 'user-1',
  email: 'investor@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
};

function createStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function dispatch(store: ReturnType<typeof createStore>) {
  return store.dispatch as AppDispatch;
}

describe('authSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears messages and expires the client session', () => {
    const store = createStore();
    store.dispatch(clearAuthError());
    store.dispatch(clearAuthInfoMessage());
    expireClientSession(store.dispatch as AppDispatch);
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isInitialized).toBe(true);
  });

  it('stores a pending verification after register', async () => {
    jest.mocked(apiRegister).mockResolvedValue({ email: user.email, message: 'Check inbox' });
    const store = createStore();
    await dispatch(store)(registerThunk({ email: user.email, password: 'Abcdefgh1!' }));
    expect(store.getState().auth.pendingVerificationEmail).toBe(user.email);
    expect(store.getState().auth.infoMessage).toBe('Check inbox');
  });

  it('rejects a failed register', async () => {
    jest.mocked(apiRegister).mockRejectedValue(new Error('taken'));
    const store = createStore();
    await dispatch(store)(registerThunk({ email: user.email, password: 'Abcdefgh1!' }));
    expect(store.getState().auth.error).toBe('taken');
  });

  it('logs in, then logs out even if the logout request fails', async () => {
    jest.mocked(apiLogin).mockResolvedValue(user);
    jest.mocked(apiLogout).mockRejectedValue(new Error('already gone'));
    const store = createStore();
    await dispatch(store)(loginThunk({ email: user.email, password: 'Abcdefgh1!' }));
    expect(store.getState().auth.user?.email).toBe(user.email);
    await dispatch(store)(logoutThunk());
    expect(store.getState().auth.user).toBeNull();
  });

  it('covers google, verify, resend, me, and extend paths', async () => {
    jest.mocked(apiGoogleLogin).mockResolvedValue(user);
    jest.mocked(apiVerifyEmail).mockResolvedValue(user);
    jest.mocked(apiResendVerification).mockResolvedValue({ email: user.email, message: 'sent' });
    jest.mocked(apiGetMe).mockResolvedValue(user);
    jest
      .mocked(apiExtendSession)
      .mockResolvedValue({ sessionExpiresAt: '2026-02-01T00:00:00.000Z', renewed: true });

    const store = createStore();
    await dispatch(store)(googleLoginThunk('id-token'));
    await dispatch(store)(verifyEmailThunk('token'));
    await dispatch(store)(resendVerificationThunk(user.email));
    await dispatch(store)(fetchCurrentUserThunk());
    await dispatch(store)(extendSessionThunk());

    expect(store.getState().auth.user?.sessionExpiresAt).toBe('2026-02-01T00:00:00.000Z');
    expect(store.getState().auth.infoMessage).toBe('sent');
  });

  it('marks the session initialized when /me fails', async () => {
    jest.mocked(apiGetMe).mockRejectedValue(new Error('no cookie'));
    const store = createStore();
    await dispatch(store)(fetchCurrentUserThunk());
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.isInitialized).toBe(true);
  });

  it('still expires local state through the expireSession reducer', () => {
    const store = createStore();
    store.dispatch(expireSession());
    expect(store.getState().auth.isInitialized).toBe(true);
  });
});
