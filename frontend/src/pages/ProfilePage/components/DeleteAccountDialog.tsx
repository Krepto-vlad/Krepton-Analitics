import { useState } from 'react';
import { Eye, EyeOff, Loader2, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import { ACCOUNT_DELETE_CONFIRMATION, ERROR_MESSAGES, ROUTES } from '../../../constants';
import { apiDeleteAccount } from '../../../api/authApi';
import { logoutThunk } from '../../../features/auth/authSlice';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { getRejectedMessage } from '../../../utils/apiError';
import { clearPersistedAlignmentExplanation } from '../../../utils/alignmentExplainStorage';
import { clearPersistedNewsBriefing } from '../../../utils/newsBriefingStorage';
import styles from '../ProfilePage.module.scss';
import { ProfileDialog } from './ProfileDialog';

interface DeleteAccountDialogProps {
  hasPassword: boolean;
  hasGoogle: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ hasPassword, hasGoogle, onClose }: DeleteAccountDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [accountDeleteConfirmText, setAccountDeleteConfirmText] = useState('');
  const [accountDeletePassword, setAccountDeletePassword] = useState('');
  const [showAccountDeletePassword, setShowAccountDeletePassword] = useState(false);
  const [accountDeleteGoogleIdToken, setAccountDeleteGoogleIdToken] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(null);

  const hasAccountDeletePasswordStepUp = accountDeletePassword.length > 0;
  const hasAccountDeleteGoogleStepUp = Boolean(accountDeleteGoogleIdToken);
  const canAccountDeleteStepUp =
    (hasAccountDeletePasswordStepUp || hasAccountDeleteGoogleStepUp) &&
    !(hasAccountDeletePasswordStepUp && hasAccountDeleteGoogleStepUp);
  const canDeleteAccount =
    accountDeleteConfirmText.trim().toUpperCase() === ACCOUNT_DELETE_CONFIRMATION &&
    canAccountDeleteStepUp;
  const confirmationMethod =
    hasPassword && hasGoogle ? 'password or Google' : hasGoogle ? 'Google' : 'your password';

  function closeDialog(): void {
    if (isDeletingAccount) {
      return;
    }
    onClose();
  }

  async function handleDeleteAccount(): Promise<void> {
    if (!canDeleteAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setAccountDeleteError(null);

    try {
      await apiDeleteAccount({
        confirm: ACCOUNT_DELETE_CONFIRMATION,
        password: hasAccountDeletePasswordStepUp ? accountDeletePassword : undefined,
        googleIdToken: hasAccountDeleteGoogleStepUp
          ? (accountDeleteGoogleIdToken ?? undefined)
          : undefined,
      });

      clearPersistedNewsBriefing();
      clearPersistedAlignmentExplanation();
      await dispatch(logoutThunk());
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      setAccountDeleteError(getRejectedMessage(error, ERROR_MESSAGES.AUTH_DELETE_ACCOUNT_FAILED));
      setAccountDeletePassword('');
      setAccountDeleteGoogleIdToken(null);
      setIsDeletingAccount(false);
    }
  }

  return (
    <ProfileDialog
      titleId="delete-account-title"
      onClose={closeDialog}
      disableClose={isDeletingAccount}
    >
      <h3 id="delete-account-title" className={styles.modalTitle}>
        Delete account
      </h3>
      <p className={styles.securityHint}>
        This permanently removes your account, portfolio, and AI history. Confirm with{' '}
        {confirmationMethod}, then type <strong>{ACCOUNT_DELETE_CONFIRMATION}</strong>.
      </p>

      {hasPassword && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Password</span>
          <div className={styles.passwordInputWrap}>
            <input
              type={showAccountDeletePassword ? 'text' : 'password'}
              className={styles.passwordInput}
              value={accountDeletePassword}
              onChange={(event) => {
                setAccountDeletePassword(event.target.value);
                setAccountDeleteGoogleIdToken(null);
              }}
              autoComplete="current-password"
              placeholder="Your password"
              disabled={isDeletingAccount || Boolean(accountDeleteGoogleIdToken)}
            />
            <button
              type="button"
              className={styles.togglePasswordButton}
              onClick={() => setShowAccountDeletePassword((visible) => !visible)}
              aria-label={showAccountDeletePassword ? 'Hide password' : 'Show password'}
            >
              {showAccountDeletePassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      )}

      {hasGoogle && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Or confirm with Google</span>
          {accountDeleteGoogleIdToken ? (
            <p className={styles.statusMessage}>Google confirmation ready.</p>
          ) : (
            <GoogleSignInButton
              text="continue_with"
              disabled={isDeletingAccount || accountDeletePassword.length > 0}
              onCredential={(idToken) => {
                setAccountDeleteGoogleIdToken(idToken);
                setAccountDeletePassword('');
                setAccountDeleteError(null);
              }}
              onError={() => setAccountDeleteError(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)}
            />
          )}
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Confirmation</span>
        <input
          className={styles.fieldInput}
          value={accountDeleteConfirmText}
          onChange={(event) => setAccountDeleteConfirmText(event.target.value)}
          placeholder={ACCOUNT_DELETE_CONFIRMATION}
          disabled={isDeletingAccount}
        />
      </label>

      {accountDeleteError && <p className={styles.errorMessage}>{accountDeleteError}</p>}

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={closeDialog}
          disabled={isDeletingAccount}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={() => void handleDeleteAccount()}
          disabled={!canDeleteAccount || isDeletingAccount}
        >
          {isDeletingAccount ? (
            <>
              <Loader2 size={14} className={styles.spinner} />
              Deleting account…
            </>
          ) : (
            <>
              <UserX size={14} />
              Delete my account
            </>
          )}
        </button>
      </div>
    </ProfileDialog>
  );
}
