import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { LOADING_MESSAGES } from '../../../../constants';
import { ContentSkeleton, type ContentSkeletonPreset } from '../../../../components/ui';
import styles from './DashboardPanelEmptyState.module.scss';

interface DashboardPanelEmptyStateProps {
  isLoading?: boolean;
  loadingMessage?: string;
  loadingPreset?: ContentSkeletonPreset;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}

export function DashboardPanelEmptyState({
  isLoading = false,
  loadingMessage = LOADING_MESSAGES.DEFAULT,
  loadingPreset = 'list',
  icon,
  title,
  description,
  actionLabel,
  actionTo,
}: DashboardPanelEmptyStateProps) {
  if (isLoading) {
    return (
      <div className={styles.panelBody}>
        <ContentSkeleton
          preset={loadingPreset}
          label={loadingMessage}
          className={styles.loadingState}
        />
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
