import type { DragEvent } from 'react';
import { CircleMinus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  DASHBOARD_INDEX_ACCESSIBLE_LABEL_PREFIX,
  DASHBOARD_INDEX_DRAG_HINT,
  DASHBOARD_INDEX_HIDE_CARD_LABEL_PREFIX,
  DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX,
  DASHBOARD_INDEX_UNAVAILABLE_MESSAGE,
  buildTickerDetailPath,
} from '../../../../constants';
import { CardCornerLink } from '../../../../components/CardCornerLink/CardCornerLink';
import { Skeleton } from '../../../../components/ui';
import { useCardNavigation } from '../../../../hooks/useCardNavigation';
import { useIndexSparkline } from '../../../../hooks/useIndexSparkline';
import type { MarketIndexData } from '../../../../hooks/useMarketIndexData';
import { formatIndexLevel } from '../../../../utils/indexLevelDisplay';
import { formatSignedPercent } from '../../../../utils/percentDisplay';
import styles from './MarketIndexCard.module.scss';

interface MarketIndexCardProps {
  ticker: string;
  label: string;
  data: MarketIndexData;
  isEditing?: boolean;
  onHide?: () => void;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  isDropTarget?: boolean;
}

export function MarketIndexCard({
  ticker,
  label,
  data,
  isEditing = false,
  onHide,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDropTarget = false,
}: MarketIndexCardProps) {
  const { quote, candles, status } = data;
  const isLoading = status === 'loading';
  const isUnavailable = status === 'error';
  const isPositive = (quote?.changePercent ?? 0) >= 0;
  const detailPath = buildTickerDetailPath(ticker);
  const isNavigable = status === 'ready' && !isEditing;
  const { containerRef } = useIndexSparkline(candles, isPositive);
  const handleCardClick = useCardNavigation(isNavigable ? detailPath : null);

  return (
    <article
      className={`${styles.card} ${isNavigable ? styles.cardClickable : ''} ${isEditing ? styles.cardEditing : ''} ${isDropTarget ? styles.cardDropTarget : ''}`}
      aria-label={label}
      aria-busy={isLoading}
      draggable={isEditing}
      title={isEditing ? DASHBOARD_INDEX_DRAG_HINT : undefined}
      onClick={handleCardClick}
      onDragStart={isEditing ? onDragStart : undefined}
      onDragOver={isEditing ? onDragOver : undefined}
      onDrop={isEditing ? onDrop : undefined}
      onDragEnd={isEditing ? onDragEnd : undefined}
    >
      {isEditing && onHide ? (
        <button
          type="button"
          className={styles.hideButton}
          aria-label={`${DASHBOARD_INDEX_HIDE_CARD_LABEL_PREFIX} ${label}`}
          title={`${DASHBOARD_INDEX_HIDE_CARD_LABEL_PREFIX} ${label}`}
          onClick={onHide}
        >
          <CircleMinus size={DASHBOARD_INDEX_SETTINGS_ICON_SIZE_PX} aria-hidden="true" />
        </button>
      ) : null}

      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.label}>{label}</span>
          <span className={styles.ticker}>{ticker}</span>
        </div>

        {isLoading ? (
          <Skeleton className={styles.valueSkeleton} />
        ) : quote ? (
          <div className={styles.values}>
            <span className={styles.level}>{formatIndexLevel(quote.price)}</span>
            <span className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
              {isPositive ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : (
                <TrendingDown size={14} aria-hidden="true" />
              )}
              <span>{formatSignedPercent(quote.changePercent)}</span>
              <span className={styles.srOnly}> today</span>
            </span>
          </div>
        ) : null}
      </div>

      {isUnavailable ? (
        <p className={styles.unavailable}>{DASHBOARD_INDEX_UNAVAILABLE_MESSAGE}</p>
      ) : null}

      <div
        ref={containerRef}
        className={styles.chart}
        data-visible={status === 'ready' && candles.length > 0 ? 'true' : 'false'}
        aria-hidden="true"
      />

      {isNavigable ? (
        <CardCornerLink
          to={detailPath}
          label={`${DASHBOARD_INDEX_ACCESSIBLE_LABEL_PREFIX} ${label}`}
        />
      ) : null}
    </article>
  );
}
