import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Minus, ShieldAlert } from 'lucide-react';
import {
  LOADING_MESSAGES,
  PORTFOLIO_ALIGNMENT_MODERATE_THRESHOLD,
  PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD,
  ROUTES,
} from '../../../../constants';
import type { PortfolioHealthDeviation } from '../../../../types/portfolio.types';
import {
  dismissStrategyDriftAlert,
  isStrategyDriftAlertDismissed,
} from '../../../../utils/strategyDriftAlertStorage';
import { DashboardPanelEmptyState } from '../DashboardPanelEmptyState/DashboardPanelEmptyState';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import styles from './PortfolioHealthCard.module.scss';

interface PortfolioHealthCardProps {
  alignmentScore: number | null;
  strategyId: string | null;
  strategyName: string | null;
  deviations: PortfolioHealthDeviation[];
  isLoading: boolean;
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
}: PortfolioHealthCardProps) {
  const [dismissedForStrategyId, setDismissedForStrategyId] = useState<string | null>(null);

  const isDriftAlertDismissed =
    strategyId != null &&
    (dismissedForStrategyId === strategyId || isStrategyDriftAlertDismissed(strategyId));

  const hasScore = alignmentScore !== null;
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
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <ShieldAlert size={13} />
          <span className={styles.cardLabel}>PORTFOLIO HEALTH</span>
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <span className={styles.cardTitle}>Strategy Alignment</span>
            {hasScore && strategyName && (
              <span className={styles.strategyName}>{strategyName}</span>
            )}
          </div>
          {!isLoading && healthLevel && healthLabel && (
            <span className={`${styles.riskBadge} ${styles[`risk${healthLevel}`]}`}>
              {healthLabel}
            </span>
          )}
        </div>
        {hasScore && (
          <Link to={ROUTES.REBALANCING} className={styles.rebalancingLink}>
            Open rebalancing engine
          </Link>
        )}
      </div>

      {isLoading || showEmptyState ? (
        <DashboardPanelEmptyState
          isLoading={isLoading}
          loadingPreset="stats"
          loadingMessage={LOADING_MESSAGES.PORTFOLIO_ALIGNMENT}
          icon={<ShieldAlert size={24} />}
          title="No alignment data yet"
          description="Add holdings or import a broker report to measure how your portfolio tracks the selected strategy."
          actionLabel="Add Position"
          actionTo={`${ROUTES.PORTFOLIO}?section=positions`}
        />
      ) : (
        <>
          <div className={styles.gaugeSection}>
            <svg
              viewBox="0 0 200 125"
              className={styles.gaugeSvg}
              aria-label={`Strategy alignment score: ${alignmentScore} out of 100`}
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
                {alignmentScore}
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

            {showDriftAlert && topDeviation && (
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
            )}
          </div>

          <div className={styles.sectors}>
            {deviations.map((deviation) => (
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
    </div>
  );
}
