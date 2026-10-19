import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { apiGoogleLogin, apiLogin, apiRegister, apiResendVerification } from '../../../api/authApi';
import { ERROR_MESSAGES, ROUTES } from '../../../constants';
import type { RootState } from '../../../store';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { AuthPage } from '../AuthPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

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

jest.mock('../../../components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: ({
    onCredential,
    onError,
    onDisabledClick,
    disabled,
    text,
  }: {
    onCredential: (idToken: string) => void;
    onError?: () => void;
    onDisabledClick?: () => void;
    disabled?: boolean;
    text?: string;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          if (disabled) {
            onDisabledClick?.();
            return;
          }
          onCredential('google-id-token');
        }}
      >
        Google {text}
      </button>
      <button type="button" onClick={() => onError?.()}>
        Google error
      </button>
    </div>
  ),
}));

function renderAuth(
  initialMode: 'login' | 'register' = 'login',
  preloadedState?: Partial<RootState>
) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.LOGIN} element={<AuthPage initialMode={initialMode} />} />
      <Route path={ROUTES.REGISTER} element={<AuthPage initialMode="register" />} />
      <Route path={ROUTES.DASHBOARD} element={<div>Dashboard home</div>} />
      <Route path={ROUTES.HOME} element={<div>Landing home</div>} />
    </Routes>,
    {
      route: initialMode === 'register' ? ROUTES.REGISTER : ROUTES.LOGIN,
      preloadedState,
    }
  );
}

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it('signs in with email and password', async () => {
    jest.mocked(apiLogin).mockResolvedValue(testUser);
    const user = userEvent.setup();
    renderAuth();

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), '  investor@example.com ');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    await user.click(
      within(document.querySelector('form') as HTMLElement).getByRole('button', { name: 'Sign In' })
    );

    await waitFor(() =>
      expect(apiLogin).toHaveBeenCalledWith({
        email: 'investor@example.com',
        password: 'Secret123!',
      })
    );
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
  });

  it('registers a new account when the form is complete', async () => {
    jest.mocked(apiRegister).mockResolvedValue({
      email: 'investor@example.com',
      message: 'Check your inbox',
    });
    const user = userEvent.setup();
    renderAuth('register');

    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByLabelText('Email Address'), 'investor@example.com');
    await user.type(screen.getByLabelText('Password'), 'Abcdefgh1!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Abcdefgh1!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(apiRegister).toHaveBeenCalled());
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
  });

  it('blocks register submit until the form is valid and shows a confirm mismatch', async () => {
    const user = userEvent.setup();
    renderAuth('register');

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await user.type(screen.getByLabelText('Password'), 'weak');
    await user.type(screen.getByLabelText('Confirm Password'), 'other');
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('switches modes, toggles theme, and goes back home', async () => {
    const user = userEvent.setup();
    renderAuth();

    await user.click(screen.getAllByRole('button', { name: 'Sign Up' })[0]);
    expect(screen.getByRole('heading', { name: 'Join Krepton' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Sign In' })[0]);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Switch to (light|dark) theme/i }));
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(await screen.findByText('Landing home')).toBeInTheDocument();
  });

  it('handles Google credential, Google errors, and terms-required clicks', async () => {
    jest.mocked(apiGoogleLogin).mockResolvedValue(testUser);
    const user = userEvent.setup();
    renderAuth('register');

    await user.click(screen.getByRole('button', { name: 'Google signup_with' }));
    expect(await screen.findByText(ERROR_MESSAGES.AUTH_GOOGLE_REQUIRES_TERMS)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Google error' }));
    expect(await screen.findByText(ERROR_MESSAGES.AUTH_GOOGLE_LOGIN_FAILED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Google signup_with' }));
    await waitFor(() => expect(apiGoogleLogin).toHaveBeenCalledWith('google-id-token'));
  });

  it('resends a verification email from the pending state', async () => {
    jest.mocked(apiResendVerification).mockResolvedValue({
      email: 'investor@example.com',
      message: 'Sent again',
    });
    const user = userEvent.setup();
    renderAuth('login', {
      auth: {
        user: null,
        isLoading: false,
        error: 'Invalid credentials',
        isInitialized: true,
        pendingVerificationEmail: 'investor@example.com',
        infoMessage: 'Please verify',
      },
    });

    expect(screen.getByText(/We sent a verification link/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() => expect(apiResendVerification).toHaveBeenCalledWith('investor@example.com'));
  });

  it('redirects an already authenticated user to the dashboard', async () => {
    renderAuth('login', {
      auth: {
        user: testUser,
        isLoading: false,
        error: null,
        isInitialized: true,
        pendingVerificationEmail: null,
        infoMessage: null,
      },
    });

    expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
  });
});
