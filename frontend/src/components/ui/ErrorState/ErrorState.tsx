import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './ErrorState.module.scss';

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  message,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Try again',
  compact = false,
  className,
}: ErrorStateProps) {
  const rootClassName = [styles.errorState, compact ? styles.compact : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} role="alert">
      <div className={styles.iconWrapper}>
        <AlertTriangle size={20} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
