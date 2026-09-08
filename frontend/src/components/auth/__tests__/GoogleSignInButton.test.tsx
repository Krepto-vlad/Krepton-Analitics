import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleSignInButton } from '../GoogleSignInButton';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';

jest.mock('../../../constants', () => ({
  ...jest.requireActual('../../../constants'),
  GOOGLE_CLIENT_ID: 'test-google-client',
}));

const googleLoginMock = jest.fn();

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GoogleLogin: (props: {
    onSuccess: (response: { credential?: string }) => void;
    onError: () => void;
  }) => {
    googleLoginMock(props);
    return (
      <div>
        <button type="button" onClick={() => props.onSuccess({ credential: 'id-token' })}>
          Continue with Google
        </button>
        <button type="button" onClick={() => props.onSuccess({})}>
          Missing credential
        </button>
        <button type="button" onClick={() => props.onError()}>
          Google error
        </button>
      </div>
    );
  },
}));

describe('GoogleSignInButton', () => {
  it('forwards a credential and reports Google errors', async () => {
    const user = userEvent.setup();
    const onCredential = jest.fn();
    const onError = jest.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} onError={onError} />);

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(onCredential).toHaveBeenCalledWith('id-token');

    await user.click(screen.getByRole('button', { name: 'Missing credential' }));
    await user.click(screen.getByRole('button', { name: 'Google error' }));
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('blocks clicks while disabled', async () => {
    const user = userEvent.setup();
    const onDisabledClick = jest.fn();
    renderWithProviders(
      <GoogleSignInButton onCredential={jest.fn()} onDisabledClick={onDisabledClick} disabled />
    );
    await user.click(
      screen.getByRole('button', { name: 'Google sign-in is currently unavailable' })
    );
    expect(onDisabledClick).toHaveBeenCalled();
  });
});
