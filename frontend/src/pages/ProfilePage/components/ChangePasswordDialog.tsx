import { useState } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import { ERROR_MESSAGES } from '../../../constants';
import { apiChangePassword } from '../../../api/authApi';
import { fetchCurrentUserThunk } from '../../../features/auth/authSlice';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { getRejectedMessage } from '../../../utils/apiError';
import { joinClassNames } from '../../../utils/classNames';
import {
  PASSWORD_RULES,
  PASSWORD_STRENGTH_BAR_NUMBERS,
  PASSWORD_STRENGTH_LABELS,
  calculatePasswordStrength,
  isPasswordStrong,
} from '../../../utils/passwordValidation';
import styles from '../ProfilePage.module.scss';
import { ProfileDialog } from './ProfileDialog';

const PASSWORD_UPDATED_MESSAGE = 'Password updated successfully.';
const PASSWORD_STEP_UP_ERROR = 'Confirm with password or Google, then enter a strong new password.';

interface ChangePasswordDialogProps {
  hasPassword: boolean;
  hasGoogle: boolean;
  onClose: () => void;
  onUpdated: (message: string) => void;
}

export function ChangePasswordDialog({
  hasPassword,
  hasGoogle,
  onClose,
  onUpdated,
}: ChangePasswordDialogProps) {
  const dispatch = useAppDispatch();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordGoogleIdToken, setPasswordGoogleIdToken] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const hasPasswordStepUp = currentPassword.length > 0;
  const hasGooglePasswordStepUp = Boolean(passwordGoogleIdToken);
  const canSubmitPassword =
    isPasswordStrong(newPassword) &&
    passwordsMatch &&
    (hasPasswordStepUp || hasGooglePasswordStepUp) &&
    !(hasPasswordStepUp && hasGooglePasswordStepUp);
  const confirmationMethod =
    hasPassword && hasGoogle
      ? 'password or Google'
      : hasGoogle
        ? 'Google'
        : 'your current password';

  async function handleChangePassword(): Promise<void> {
    setPasswordError(null);

    if (!canSubmitPassword) {
      setPasswordError(PASSWORD_STEP_UP_ERROR);
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiChangePassword({
        newPassword,
        password: hasPasswordStepUp ? currentPassword : undefined,
        googleIdToken: hasGooglePasswordStepUp ? (passwordGoogleIdToken ?? undefined) : undefined,
      });
      await dispatch(fetchCurrentUserThunk());
      onUpdated(PASSWORD_UPDATED_MESSAGE);
    } catch (error) {
      setPasswordError(getRejectedMessage(error, ERROR_MESSAGES.AUTH_CHANGE_PASSWORD_FAILED));
      setIsChangingPassword(false);
    }
  }

  return (
    <ProfileDialog
      titleId="change-password-title"
      onClose={onClose}
      disableClose={isChangingPassword}
    >
      <h3 id="change-password-title" className={styles.modalTitle}>
        {hasPassword ? 'Change password' : 'Set password'}
      </h3>
      <p className={styles.securityHint}>
        Confirm with {confirmationMethod} before saving a new password.
      </p>

      {hasPassword && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Current password</span>
          <div className={styles.passwordInputWrap}>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              className={styles.passwordInput}
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setPasswordGoogleIdToken(null);
              }}
              autoComplete="current-password"
              placeholder="Your current password"
              disabled={Boolean(passwordGoogleIdToken)}
            />
            <button
              type="button"
              className={styles.togglePasswordButton}
              onClick={() => setShowCurrentPassword((visible) => !visible)}
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      )}

      {hasGoogle && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Or confirm with Google</span>
          {passwordGoogleIdToken ? (
            <p className={styles.statusMessage}>Google confirmation ready.</p>
          ) : (
            <GoogleSignInButton
              text="continue_with"
              disabled={isChangingPassword || currentPassword.length > 0}
              onCredential={(idToken) => {
                setPasswordGoogleIdToken(idToken);
                setCurrentPassword('');
                setPasswordError(null);
              }}
              onError={() => setPasswordError(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)}
            />
          )}
        </div>
      )}

      <div className={styles.field}>
        <span className={styles.fieldLabel}>New password</span>
        <input
          type="password"
          className={styles.fieldInput}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Min. 10 chars, uppercase, number, symbol"
        />

        {newPassword.length > 0 && (
          <div
            className={joinClassNames(
              styles.strengthRow,
              passwordStrength > 0 && styles[`strengthLevel${passwordStrength}`]
            )}
          >
            <div className={styles.strengthBars}>
              {PASSWORD_STRENGTH_BAR_NUMBERS.map((barNumber) => (
                <div
                  key={barNumber}
                  className={joinClassNames(
                    styles.strengthBar,
                    barNumber <= passwordStrength && styles.filled
                  )}
                />
              ))}
            </div>
            <span className={styles.strengthLabel}>
              {PASSWORD_STRENGTH_LABELS[passwordStrength]}
            </span>
          </div>
        )}

        <div className={styles.passwordRules}>
          <p className={styles.passwordRulesTitle}>Password requirements</p>
          {PASSWORD_RULES.map((rule) => {
            const passed = newPassword.length > 0 && rule.test(newPassword);
            const touched = newPassword.length > 0;
            const ruleStateClassName = passed ? styles.passed : touched ? styles.failed : undefined;

            return (
              <div
                key={rule.id}
                className={joinClassNames(styles.passwordRule, ruleStateClassName)}
              >
                <div className={joinClassNames(styles.passwordRuleIcon, ruleStateClassName)}>
                  {passed && <Check size={8} />}
                  {!passed && touched && <span className={styles.passwordRuleFailMark}>✕</span>}
                </div>
                {rule.label}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Confirm new password</span>
        <div
          className={`${styles.passwordInputWrap} ${
            confirmPassword.length > 0
              ? passwordsMatch
                ? styles.passwordInputWrapSuccess
                : styles.passwordInputWrapError
              : ''
          }`}
        >
          <input
            type="password"
            className={styles.passwordInput}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Repeat your new password"
          />
          {confirmPassword.length > 0 &&
            (passwordsMatch ? (
              <Check size={14} color="#10B981" />
            ) : (
              <span className={styles.passwordRuleFailMark}>✕</span>
            ))}
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className={styles.fieldHintError}>Passwords do not match</p>
        )}
        {passwordsMatch && <p className={styles.fieldHintSuccess}>Passwords match ✓</p>}
      </div>

      {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
          disabled={isChangingPassword}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void handleChangePassword()}
          disabled={!canSubmitPassword || isChangingPassword}
        >
          {isChangingPassword ? (
            <>
              <Loader2 size={14} className={styles.spinner} />
              Saving…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </div>
    </ProfileDialog>
  );
}
