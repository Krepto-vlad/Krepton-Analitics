import type { ReactNode } from 'react';
import { Loader } from 'lucide-react';
import { LOADING_MESSAGES } from '../../../constants';
import { joinClassNames } from '../../../utils/classNames';
import { ErrorState } from '../ErrorState/ErrorState';
import { ContentSkeleton, type ContentSkeletonPreset } from '../Skeleton/Skeleton';
import styles from './AsyncStatePanel.module.scss';

/** Data fetches render a layout skeleton; short mutations may keep a spinner. */
type AsyncLoadingPreset = ContentSkeletonPreset | 'spinner';

interface AsyncStatePanelProps {
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingMessage?: string;
  loadingPreset?: AsyncLoadingPreset;
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
  loadingMessage = LOADING_MESSAGES.DEFAULT,
  loadingPreset = 'list',
  errorTitle,
  emptyContent,
  onRetry,
  retryLabel,
  children,
  className,
}: AsyncStatePanelProps) {
  if (isLoading) {
    if (loadingPreset === 'spinner') {
      return (
        <div
          className={joinClassNames(styles.spinnerState, className)}
          role="status"
          aria-busy="true"
          aria-label={loadingMessage}
        >
          <Loader className={styles.spinner} />
          <span>{loadingMessage}</span>
        </div>
      );
    }

    return <ContentSkeleton preset={loadingPreset} label={loadingMessage} className={className} />;
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
