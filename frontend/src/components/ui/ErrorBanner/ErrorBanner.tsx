import { AlertTriangle, X } from 'lucide-react';
import { ERROR_BANNER_DISMISS_LABEL } from '../../../constants';
import styles from './ErrorBanner.module.scss';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  if (!message) return null;

  const rootClassName = className ? `${styles.errorBanner} ${className}` : styles.errorBanner;

  return (
    <div className={rootClassName} role="alert">
      <AlertTriangle size={15} className={styles.icon} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
      {onDismiss && (
        <button
          type="button"
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label={ERROR_BANNER_DISMISS_LABEL}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
