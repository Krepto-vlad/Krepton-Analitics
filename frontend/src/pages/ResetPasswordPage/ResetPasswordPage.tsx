import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, KeyRound, Loader2 } from 'lucide-react';
import { ERROR_MESSAGES, ROUTES } from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { Button, ErrorBanner, Input } from '../../components/ui';
import { apiResetPassword } from '../../api/authApi';
import { getRejectedMessage } from '../../utils/apiError';
import {
  PASSWORD_RULES,
  PASSWORD_STRENGTH_BAR_NUMBERS,
  PASSWORD_STRENGTH_LABELS,
  calculatePasswordStrength,
  isPasswordStrong,
} from '../../utils/passwordValidation';
import { joinClassNames } from '../../utils/classNames';
import { usePageSeo } from '../../hooks/usePageSeo';
import styles from './ResetPasswordPage.module.scss';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  usePageSeo(PAGE_SEO_METADATA[ROUTES.RESET_PASSWORD]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = Boolean(token) && isPasswordStrong(newPassword) && passwordsMatch;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await apiResetPassword({ token, newPassword });
      setSuccessMessage(result.message);
      window.setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      }, 1600);
    } catch (submitError) {
      setError(getRejectedMessage(submitError, ERROR_MESSAGES.AUTH_RESET_PASSWORD_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <KeyRound size={28} className={styles.icon} />
        <h1 className={styles.title}>Reset password</h1>

        {!token && (
          <>
            <p className={styles.text}>This reset link is missing a token.</p>
            <Link to={ROUTES.FORGOT_PASSWORD} className={styles.link}>
              Request a new reset link
            </Link>
          </>
        )}

        {token && successMessage && (
          <>
            <p className={styles.successBox}>{successMessage}</p>
            <Link to={ROUTES.LOGIN} className={styles.link}>
              Continue to sign in
            </Link>
          </>
        )}

        {token && !successMessage && (
          <>
            <p className={styles.text}>Choose a new password for your account.</p>
            <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
              <div className={styles.fieldGroup}>
                <Input
                  id="new-password"
                  label="New password"
                  type="password"
                  placeholder="Min. 10 chars, uppercase, number, symbol"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
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
                    const ruleStateClass = passed
                      ? styles.passed
                      : touched
                        ? styles.failed
                        : undefined;
                    return (
                      <div
                        key={rule.id}
                        className={`${styles.passwordRule} ${ruleStateClass ?? ''}`.trim()}
                      >
                        <span
                          className={`${styles.passwordRuleIcon} ${ruleStateClass ?? ''}`.trim()}
                        >
                          {passed ? (
                            <Check size={12} />
                          ) : touched ? (
                            <span className={styles.passwordRuleFailMark}>✕</span>
                          ) : null}
                        </span>
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <Input
                  id="confirm-password"
                  label="Confirm new password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className={styles.fieldHintError}>Passwords do not match</p>
                )}
                {passwordsMatch && <p className={styles.fieldHintSuccess}>Passwords match ✓</p>}
              </div>

              {error && <ErrorBanner message={error} />}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!canSubmit || isSubmitting}
                leftIcon={
                  isSubmitting ? <Loader2 size={16} className={styles.spinner} /> : undefined
                }
              >
                {isSubmitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>

            <Link to={ROUTES.FORGOT_PASSWORD} className={styles.link}>
              Request a new reset link
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
