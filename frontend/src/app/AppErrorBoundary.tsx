import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../components/ui';
import { ERROR_BOUNDARY_RETRY_LABEL, ERROR_BOUNDARY_TITLE, ERROR_MESSAGES } from '../constants';
import { logClientError } from '../utils/clientErrorLog';
import styles from './AppErrorBoundary.module.scss';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  recoveryKey: number;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    recoveryKey: 0,
  };

  static getDerivedStateFromError(
    error: Error
  ): Pick<AppErrorBoundaryState, 'hasError' | 'errorMessage'> {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logClientError(error, errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState((current) => ({
      hasError: false,
      errorMessage: null,
      recoveryKey: current.recoveryKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <ErrorState
            title={ERROR_BOUNDARY_TITLE}
            message={
              this.state.errorMessage
                ? `${ERROR_MESSAGES.APP_RENDER_FAILED} ${this.state.errorMessage}`
                : ERROR_MESSAGES.APP_RENDER_FAILED
            }
            retryLabel={ERROR_BOUNDARY_RETRY_LABEL}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return <Fragment key={this.state.recoveryKey}>{this.props.children}</Fragment>;
  }
}
