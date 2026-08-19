import type { ReactElement } from 'react';
import {
  LOADING_MESSAGES,
  SKELETON_CARD_COUNT,
  SKELETON_COMPARE_COLUMN_COUNT,
  SKELETON_LIST_ITEM_COUNT,
  SKELETON_MOVER_COLUMN_COUNT,
  SKELETON_MOVER_ROW_COUNT,
  SKELETON_NEWS_ITEM_COUNT,
  SKELETON_STAT_ROW_COUNT,
  SKELETON_TABLE_COLUMN_COUNT,
  SKELETON_TABLE_ROW_COUNT,
} from '../../../constants';
import { joinClassNames } from '../../../utils/classNames';
import styles from './Skeleton.module.scss';

type SkeletonRadius = 'sm' | 'md' | 'lg' | 'full';

export type ContentSkeletonPreset =
  'list' | 'table' | 'news' | 'chart' | 'stats' | 'cards' | 'page' | 'movers' | 'compare';

interface SkeletonProps {
  radius?: SkeletonRadius;
  /** Sizing comes from the caller stylesheet — the primitive never sets inline styles. */
  className?: string;
}

interface ContentSkeletonProps {
  preset: ContentSkeletonPreset;
  label?: string;
  className?: string;
}

const SKELETON_RADIUS_CLASS_NAME: Record<SkeletonRadius, string> = {
  sm: styles.radiusSm,
  md: styles.radiusMd,
  lg: styles.radiusLg,
  full: styles.radiusFull,
};

function buildIndexRange(itemCount: number): number[] {
  return Array.from({ length: itemCount }, (_, index) => index);
}

export function Skeleton({ radius = 'md', className }: SkeletonProps) {
  return (
    <span
      className={joinClassNames(styles.bone, SKELETON_RADIUS_CLASS_NAME[radius], className)}
      aria-hidden="true"
    />
  );
}

function SkeletonAvatar() {
  return <Skeleton radius="full" className={styles.avatar} />;
}

function ListSkeleton() {
  return (
    <div className={styles.stack}>
      {buildIndexRange(SKELETON_LIST_ITEM_COUNT).map((itemIndex) => (
        <div key={`list-item-${itemIndex}`} className={styles.listItem}>
          <SkeletonAvatar />
          <div className={styles.listText}>
            <Skeleton className={styles.lineWide} />
            <Skeleton className={styles.lineMedium} />
          </div>
          <Skeleton className={styles.lineNarrow} />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className={styles.stack}>
      {buildIndexRange(SKELETON_TABLE_ROW_COUNT).map((rowIndex) => (
        <div key={`table-row-${rowIndex}`} className={styles.tableRow}>
          {buildIndexRange(SKELETON_TABLE_COLUMN_COUNT).map((columnIndex) => (
            <Skeleton key={`table-cell-${rowIndex}-${columnIndex}`} className={styles.tableCell} />
          ))}
        </div>
      ))}
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className={styles.stack}>
      {buildIndexRange(SKELETON_NEWS_ITEM_COUNT).map((itemIndex) => (
        <div key={`news-item-${itemIndex}`} className={styles.newsItem}>
          <SkeletonAvatar />
          <div className={styles.newsText}>
            <Skeleton className={styles.lineMedium} />
            <Skeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={styles.stack}>
      {buildIndexRange(SKELETON_STAT_ROW_COUNT).map((rowIndex) => (
        <div key={`stat-row-${rowIndex}`} className={styles.statRow}>
          <Skeleton className={styles.lineMedium} />
          <Skeleton className={styles.lineNarrow} />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className={styles.cardsRow}>
      {buildIndexRange(SKELETON_CARD_COUNT).map((cardIndex) => (
        <div key={`card-${cardIndex}`} className={styles.card}>
          <Skeleton className={styles.lineMedium} />
          <Skeleton className={joinClassNames(styles.title, styles.lineWide)} />
          <Skeleton className={styles.lineNarrow} />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton radius="lg" className={styles.chart} />;
}

function MoversSkeleton() {
  return (
    <div className={styles.moversGrid}>
      {buildIndexRange(SKELETON_MOVER_COLUMN_COUNT).map((columnIndex) => (
        <div key={`movers-column-${columnIndex}`} className={styles.moversColumn}>
          <Skeleton className={styles.lineMedium} />
          {buildIndexRange(SKELETON_MOVER_ROW_COUNT).map((rowIndex) => (
            <div key={`movers-row-${columnIndex}-${rowIndex}`} className={styles.listItem}>
              <SkeletonAvatar />
              <div className={styles.listText}>
                <Skeleton className={styles.lineWide} />
                <Skeleton className={styles.lineMedium} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CompareSkeleton() {
  return (
    <div className={styles.stack}>
      <div className={styles.compareHeader}>
        <Skeleton className={styles.lineMedium} />
        {buildIndexRange(SKELETON_COMPARE_COLUMN_COUNT).map((columnIndex) => (
          <Skeleton key={`compare-header-${columnIndex}`} className={styles.title} />
        ))}
      </div>
      {buildIndexRange(SKELETON_STAT_ROW_COUNT).map((rowIndex) => (
        <div key={`compare-row-${rowIndex}`} className={styles.compareRow}>
          <Skeleton className={styles.lineWide} />
          {buildIndexRange(SKELETON_COMPARE_COLUMN_COUNT).map((columnIndex) => (
            <Skeleton key={`compare-cell-${rowIndex}-${columnIndex}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className={styles.page}>
      <CardsSkeleton />
      <ChartSkeleton />
      <ListSkeleton />
    </div>
  );
}

const SKELETON_PRESET_RENDERERS: Record<ContentSkeletonPreset, () => ReactElement> = {
  list: ListSkeleton,
  table: TableSkeleton,
  news: NewsSkeleton,
  chart: ChartSkeleton,
  stats: StatsSkeleton,
  cards: CardsSkeleton,
  page: PageSkeleton,
  movers: MoversSkeleton,
  compare: CompareSkeleton,
};

/** Announces the pending fetch once and renders the layout placeholder for it. */
export function ContentSkeleton({
  preset,
  label = LOADING_MESSAGES.DEFAULT,
  className,
}: ContentSkeletonProps) {
  const PresetSkeleton = SKELETON_PRESET_RENDERERS[preset];

  return (
    <div
      className={joinClassNames(styles.stack, className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <PresetSkeleton />
    </div>
  );
}
