import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { ERROR_MESSAGES, ROUTES } from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { Button, ErrorBanner, Input } from '../../components/ui';
import { apiForgotPassword } from '../../api/authApi';
import { getRejectedMessage } from '../../utils/apiError';
import { usePageSeo } from '../../hooks/usePageSeo';
import styles from './ForgotPasswordPage.module.scss';

export function ForgotPasswordPage() {
  usePageSeo(PAGE_SEO_METADATA[ROUTES.FORGOT_PASSWORD]);

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!email.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await apiForgotPassword(email.trim().toLowerCase());
      setSuccessMessage(result.message);
    } catch (submitError) {
      setError(getRejectedMessage(submitError, ERROR_MESSAGES.AUTH_FORGOT_PASSWORD_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <KeyRound size={28} className={styles.icon} />
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.text}>
          Enter your account email. If it matches a Krepton account, we will send reset
          instructions.
        </p>

        {successMessage ? (
          <p className={styles.successBox}>{successMessage}</p>
        ) : (
          <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
            <Input
              id="forgot-email"
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            {error && <ErrorBanner message={error} />}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!email.trim() || isSubmitting}
              leftIcon={isSubmitting ? <Loader2 size={16} className={styles.spinner} /> : undefined}
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <div className={styles.links}>
          <Link to={ROUTES.LOGIN} className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
