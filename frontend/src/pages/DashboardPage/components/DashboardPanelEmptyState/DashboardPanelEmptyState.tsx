import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader, ChevronRight } from 'lucide-react';
import styles from './DashboardPanelEmptyState.module.scss';

interface DashboardPanelEmptyStateProps {
  isLoading?: boolean;
  loadingMessage?: string;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}

export function DashboardPanelEmptyState({
  isLoading = false,
  loadingMessage = 'Loading…',
  icon,
  title,
  description,
  actionLabel,
  actionTo,
}: DashboardPanelEmptyStateProps) {
  if (isLoading) {
    return (
      <div className={styles.panelBody}>
        <div className={styles.loadingState} aria-busy="true">
          <Loader size={22} className={styles.loadingSpinner} />
          <p className={styles.loadingText}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelBody}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>{icon}</div>
        <h3 className={styles.emptyTitle}>{title}</h3>
        <p className={styles.emptyText}>{description}</p>
        <Link to={actionTo} className={styles.emptyAction}>
          {actionLabel}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
