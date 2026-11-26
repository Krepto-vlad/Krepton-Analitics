import { useState } from 'react';
import { AlertTriangle, Minus, ShieldAlert } from 'lucide-react';
import {
  DASHBOARD_HEALTH_SECTOR_PLACEHOLDER_COUNT,
  LOADING_MESSAGES,
  PORTFOLIO_ALIGNMENT_MODERATE_THRESHOLD,
  PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD,
  PORTFOLIO_POSITIONS_PATH,
} from '../../constants';
import type { PortfolioHealthDeviation } from '../../types/portfolio.types';
import {
  dismissStrategyDriftAlert,
  isStrategyDriftAlertDismissed,
} from '../../utils/strategyDriftAlertStorage';
import { useCardNavigation } from '../../hooks/useCardNavigation';
import { Skeleton } from '../ui';
import { CardCornerLink } from '../CardCornerLink/CardCornerLink';
import { PanelEmptyState } from '../PanelEmptyState/PanelEmptyState';
import { toCssCustomProperties } from '../../utils/cssCustomProperties';
import styles from './PortfolioHealthCard.module.scss';

const HEALTH_SECTOR_PLACEHOLDER_KEYS = Array.from(
  { length: DASHBOARD_HEALTH_SECTOR_PLACEHOLDER_COUNT },
  (_, index) => `health-sector-placeholder-${index}`
);

interface PortfolioHealthCardProps {
  alignmentScore: number | null;
  strategyId: string | null;
  strategyName: string | null;
  deviations: PortfolioHealthDeviation[];
  isLoading: boolean;
  /** Where the card and its corner arrow lead. Leave out on the page the card already explains. */
  navigation?: CardNavigation;
  /** The drift banner repeats the deviation table on the rebalancing page, so that page hides it. */
  showDriftAlert?: boolean;
  /** `wide` puts the gauge beside the allocation bars when the page is wide enough. */
  layout?: PortfolioHealthCardLayout;
}

export type PortfolioHealthCardLayout = 'stacked' | 'wide';

export interface CardNavigation {
  to: string;
  label: string;
}

type HealthLevel = 'Low' | 'Medium' | 'High';

const GAUGE_CX = 100;
const GAUGE_CY = 115;
const GAUGE_RADIUS = 82;

function getHealthLevel(score: number): HealthLevel {
  if (score >= PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD) return 'Low';
  if (score >= PORTFOLIO_ALIGNMENT_MODERATE_THRESHOLD) return 'Medium';
  return 'High';
}

function getHealthLabel(level: HealthLevel): string {
  if (level === 'Low') return 'Well Aligned';
  if (level === 'Medium') return 'Moderate Drift';
  return 'High Drift';
}

function buildGaugeArcPath(score: number): string {
  if (score <= 0) return '';
  if (score >= 100) {
    return `M ${GAUGE_CX - GAUGE_RADIUS} ${GAUGE_CY} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CX + GAUGE_RADIUS} ${GAUGE_CY}`;
  }

  const angleRad = ((180 - (score / 100) * 180) * Math.PI) / 180;
  const endX = GAUGE_CX + GAUGE_RADIUS * Math.cos(angleRad);
  const endY = GAUGE_CY - GAUGE_RADIUS * Math.sin(angleRad);

  return `M ${GAUGE_CX - GAUGE_RADIUS} ${GAUGE_CY} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

function formatAllocationPair(currentPercent: number, targetPercent: number): string {
  return `${currentPercent.toFixed(1)}% / ${targetPercent.toFixed(1)}%`;
}

export function PortfolioHealthCard({
  alignmentScore,
  strategyId,
  strategyName,
  deviations,
  isLoading,
  navigation,
  showDriftAlert: isDriftAlertAllowed = true,
  layout = 'stacked',
}: PortfolioHealthCardProps) {
  const [dismissedForStrategyId, setDismissedForStrategyId] = useState<string | null>(null);

  const isDriftAlertDismissed =
    strategyId != null &&
    (dismissedForStrategyId === strategyId || isStrategyDriftAlertDismissed(strategyId));

  const hasScore = alignmentScore !== null;
  const isNavigable = hasScore && !isLoading && navigation !== undefined;
  const handleCardClick = useCardNavigation(isNavigable ? navigation.to : null);
  const showEmptyState = !isLoading && !hasScore;
  const healthLevel = hasScore ? getHealthLevel(alignmentScore) : null;
  const healthLabel = healthLevel ? getHealthLabel(healthLevel) : null;
  const bgArcPath = `M ${GAUGE_CX - GAUGE_RADIUS} ${GAUGE_CY} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CX + GAUGE_RADIUS} ${GAUGE_CY}`;
  const progressArcPath = hasScore ? buildGaugeArcPath(alignmentScore) : '';

  const notableDeviations = deviations.filter((item) => item.status !== 'optimal');
  const topDeviation =
    notableDeviations.length > 0
      ? notableDeviations.reduce(
          (max, item) =>
            Math.abs(item.deviationPercent) > Math.abs(max.deviationPercent) ? item : max,
          notableDeviations[0]
        )
      : null;

  const showDriftAlert =
    isDriftAlertAllowed &&
    hasScore &&
    !isDriftAlertDismissed &&
    (alignmentScore < PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD || topDeviation !== null);

  function handleDismissDriftAlert(): void {
    if (!strategyId) {
      return;
    }

    dismissStrategyDriftAlert(strategyId);
    setDismissedForStrategyId(strategyId);
  }

  return (
    <div
      className={`${styles.card} ${layout === 'wide' ? styles.cardWide : ''} ${isNavigable ? styles.cardClickable : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <ShieldAlert size={13} />
          <span className={styles.cardLabel}>PORTFOLIO HEALTH</span>
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <span className={styles.cardTitle}>Strategy Alignment</span>
            <span className={styles.strategyName}>
              {hasScore && strategyName ? strategyName : '\u00a0'}
            </span>
          </div>
          <span className={styles.riskBadgeSlot}>
            {!isLoading && healthLevel && healthLabel ? (
              <span className={`${styles.riskBadge} ${styles[`risk${healthLevel}`]}`}>
                {healthLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {showEmptyState ? (
        <PanelEmptyState
          isLoading={false}
          loadingPreset="stats"
          loadingMessage={LOADING_MESSAGES.PORTFOLIO_ALIGNMENT}
          icon={<ShieldAlert size={24} />}
          title="No alignment data yet"
          description="Add holdings or import a broker report to measure how your portfolio tracks the selected strategy."
          actionLabel="Add Position"
          actionTo={PORTFOLIO_POSITIONS_PATH}
        />
      ) : (
        <>
          <div className={styles.gaugeSection}>
            <svg
              viewBox="0 0 200 125"
              className={styles.gaugeSvg}
              aria-busy={isLoading}
              aria-label={
                hasScore
                  ? `Strategy alignment score: ${alignmentScore} out of 100`
                  : 'Loading strategy alignment score'
              }
            >
              <path d={bgArcPath} className={styles.gaugeTrack} />
              {healthLevel && progressArcPath && (
                <path
                  d={progressArcPath}
                  className={`${styles.gaugeProgress} ${styles[`gaugeProgress${healthLevel}`]}`}
                />
              )}
              <text
                x={GAUGE_CX}
                y={GAUGE_CY - 22}
                textAnchor="middle"
                className={`${styles.gaugeScore}${healthLevel ? ` ${styles[`gaugeScore${healthLevel}`]}` : ''}`}
              >
                {hasScore ? alignmentScore : '\u2014'}
              </text>
              <text
                x={GAUGE_CX}
                y={GAUGE_CY - 4}
                textAnchor="middle"
                className={styles.gaugeScoreSuffix}
              >
                / 100
              </text>
            </svg>

            {isDriftAlertAllowed ? (
              <div className={styles.alertSlot}>
                {showDriftAlert && topDeviation ? (
                  <div className={styles.alertBanner}>
                    <AlertTriangle size={13} className={styles.alertIcon} />
                    <span className={styles.alertContent}>
                      <span className={styles.alertHighlight}>Strategy drift detected</span>
                      <span className={styles.alertBody}>
                        {' '}
                        {topDeviation.label} is{' '}
                        {topDeviation.status === 'overweight' ? 'over-weight' : 'under-weight'} by{' '}
                        {Math.abs(topDeviation.deviationPercent).toFixed(1)}% vs target.
                      </span>
                    </span>
                    <button
                      type="button"
                      className={styles.alertDismissButton}
                      onClick={handleDismissDriftAlert}
                      aria-label="Dismiss strategy drift alert"
                      title="Dismiss"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={styles.sectors}>
            {isLoading
              ? HEALTH_SECTOR_PLACEHOLDER_KEYS.map((placeholderKey) => (
                  <div key={placeholderKey} className={styles.sectorRow}>
                    <div className={styles.sectorRowHeader}>
                      <div className={styles.sectorNameGroup}>
                        <span className={styles.sectorIconPlaceholder} aria-hidden="true" />
                        <span className={styles.sectorNameSkeleton}>
                          <Skeleton />
                        </span>
                      </div>
                      <span className={styles.sectorPercentSkeleton}>
                        <Skeleton />
                      </span>
                    </div>
                    <div className={styles.barTrack} />
                  </div>
                ))
              : deviations.map((deviation) => (
                  <div key={deviation.bucketId} className={styles.sectorRow}>
                    <div className={styles.sectorRowHeader}>
                      <div className={styles.sectorNameGroup}>
                        <span
                          className={styles.sectorIcon}
                          style={toCssCustomProperties({ '--swatch-color': deviation.color })}
                          aria-hidden="true"
                        />
                        <span className={styles.sectorName}>{deviation.label}</span>
                      </div>
                      <span className={styles.sectorPercent}>
                        {formatAllocationPair(deviation.currentPercent, deviation.targetPercent)}
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={toCssCustomProperties({
                          '--fill-percent': `${Math.max(deviation.currentPercent, 0)}%`,
                          '--swatch-color': deviation.color,
                        })}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </>
      )}

      {isNavigable ? <CardCornerLink to={navigation.to} label={navigation.label} /> : null}
    </div>
  );
}
