import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { ERROR_MESSAGES, ROUTES } from '../../constants';
import { apiGrantAdminEntitlement, apiLookupAdminEntitlement } from '../../api/billingApi';
import { getRejectedMessage } from '../../utils/apiError';
import styles from './AdminPage.module.scss';

export function AdminPage() {
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleLookup() {
    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const grant = await apiLookupAdminEntitlement(email);
      setMessage(
        grant.isPaid
          ? `${grant.email} has Plus until ${grant.expiresAt || 'an unknown date'}.`
          : `${grant.email} is on Free.`
      );
    } catch (lookupError) {
      setError(getRejectedMessage(lookupError, ERROR_MESSAGES.BILLING_ADMIN_GRANT_FAILED));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGrant() {
    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const isoExpiresAt = new Date(expiresAt).toISOString();
      const grant = await apiGrantAdminEntitlement(email, isoExpiresAt);
      setMessage(`Granted Plus to ${grant.email} until ${grant.expiresAt}.`);
    } catch (grantError) {
      setError(getRejectedMessage(grantError, ERROR_MESSAGES.BILLING_ADMIN_GRANT_FAILED));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to={ROUTES.PROFILE} className={styles.backLink}>
        <ArrowLeft size={14} />
        Back to profile
      </Link>
      <div className={styles.titleRow}>
        <Shield size={20} />
        <h2 className={styles.title}>Complimentary Plus</h2>
      </div>
      <p className={styles.subtitle}>
        Grant Plus without Paddle. Webhooks will not overwrite this expiry; paid Paddle access can
        still sit alongside it.
      </p>

      <label className={styles.field}>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
        />
      </label>
      <label className={styles.field}>
        Access until
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
        />
      </label>

      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" onClick={() => void handleLookup()} disabled={isBusy || !email}>
          Look up
        </button>
        <button
          type="button"
          onClick={() => void handleGrant()}
          disabled={isBusy || !email || !expiresAt}
        >
          Grant Plus
        </button>
      </div>
    </div>
  );
}
