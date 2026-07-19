import type { ReactNode } from 'react';
import { Loader } from 'lucide-react';
import { ErrorState } from '../ErrorState/ErrorState';
import styles from './AsyncStatePanel.module.scss';

interface AsyncStatePanelProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  errorTitle?: string;
  emptyContent?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function AsyncStatePanel({
  isLoading = false,
  error = null,
  isEmpty = false,
  loadingMessage = 'Loading…',
  errorTitle,
  emptyContent,
  onRetry,
  retryLabel,
  children,
  className,
}: AsyncStatePanelProps) {
  if (isLoading) {
    return (
      <div className={`${styles.loadingState} ${className ?? ''}`} aria-busy="true">
        <Loader size={22} className={styles.spinner} />
        <span>{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={errorTitle}
        message={error}
        onRetry={onRetry}
        retryLabel={retryLabel}
        className={className}
      />
    );
  }

  if (isEmpty && emptyContent) {
    return <>{emptyContent}</>;
  }

  return <>{children}</>;
}
