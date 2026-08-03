import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import styles from './GoogleSignInButton.module.scss';

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  onError?: () => void;
  disabled?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const { theme } = useTheme();
  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className={styles.unavailableHint}>
        Google sign-in is not configured (`VITE_GOOGLE_CLIENT_ID`).
      </p>
    );
  }

  function handleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) {
      onError?.();
      return;
    }
    onCredential(credentialResponse.credential);
  }

  return (
    <div className={`${styles.wrap} ${disabled ? styles.disabled : ''}`}>
      <GoogleLogin
        key={theme}
        onSuccess={handleSuccess}
        onError={() => onError?.()}
        useOneTap={false}
        theme={theme === 'light' ? 'outline' : 'filled_black'}
        size="large"
        shape="rectangular"
        text={text}
        locale="en"
        width="100%"
      />
    </div>
  );
}
