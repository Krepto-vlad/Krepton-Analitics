import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  CHART_COLORS,
  PORTFOLIO_ALIGNMENT_MODERATE_THRESHOLD,
  PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD,
  ROUTES,
} from '../../../../constants';
import type { PortfolioHealthDeviation } from '../../../../types/portfolio.types';
import styles from './PortfolioHealthCard.module.scss';

interface PortfolioHealthCardProps {
  alignmentScore: number | null;
  strategyName: string | null;
  deviations: PortfolioHealthDeviation[];
  isLoading: boolean;
}

type HealthLevel = 'Low' | 'Medium' | 'High';

const GAUGE_CX = 100;
const GAUGE_CY = 115;
const GAUGE_RADIUS = 82;
const GAUGE_STROKE_WIDTH = 10;

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
  strategyName,
  deviations,
  isLoading,
}: PortfolioHealthCardProps) {
  const score = alignmentScore ?? 0;
  const healthLevel = getHealthLevel(score);
  const healthLabel = getHealthLabel(healthLevel);
  const bgArcPath = `M ${GAUGE_CX - GAUGE_RADIUS} ${GAUGE_CY} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CX + GAUGE_RADIUS} ${GAUGE_CY}`;
  const progressArcPath = buildGaugeArcPath(score);

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
    alignmentScore !== null &&
    (alignmentScore < PORTFOLIO_ALIGNMENT_OPTIMAL_THRESHOLD || topDeviation !== null);

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
            {strategyName && <span className={styles.strategyName}>{strategyName}</span>}
          </div>
          {!isLoading && alignmentScore !== null && (
            <span className={`${styles.riskBadge} ${styles[`risk${healthLevel}`]}`}>
              {healthLabel}
            </span>
          )}
        </div>
        <Link to={ROUTES.REBALANCING} className={styles.rebalancingLink}>
          Open rebalancing engine
        </Link>
      </div>

      <div className={styles.gaugeSection}>
        <svg
          viewBox="0 0 200 125"
          className={styles.gaugeSvg}
          aria-label={
            alignmentScore !== null
              ? `Strategy alignment score: ${alignmentScore} out of 100`
              : 'Strategy alignment score loading'
          }
        >
          <path
            d={bgArcPath}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={GAUGE_STROKE_WIDTH}
            strokeLinecap="round"
          />
          {!isLoading && progressArcPath && (
            <path
              d={progressArcPath}
              className={`${styles.gaugeProgress} ${styles[`gaugeProgress${healthLevel}`]}`}
            />
          )}
          <text
            x={GAUGE_CX}
            y={GAUGE_CY - 22}
            textAnchor="middle"
            className={`${styles.gaugeScore} ${styles[`gaugeScore${healthLevel}`]}`}
          >
            {isLoading ? '—' : (alignmentScore ?? '—')}
          </text>
          <text
            x={GAUGE_CX}
            y={GAUGE_CY - 4}
            textAnchor="middle"
            fill={CHART_COLORS.TEXT}
            fontSize="13"
            fontFamily="Inter, sans-serif"
          >
            / 100
          </text>
        </svg>

        {showDriftAlert && topDeviation && (
          <div className={styles.alertBanner}>
            <AlertTriangle size={13} className={styles.alertIcon} />
            <span>
              <span className={styles.alertHighlight}>Strategy drift detected</span>
              <span className={styles.alertBody}>
                {' '}
                {topDeviation.label} is{' '}
                {topDeviation.status === 'overweight' ? 'over-weight' : 'under-weight'} by{' '}
                {Math.abs(topDeviation.deviationPercent).toFixed(1)}% vs target.
              </span>
            </span>
          </div>
        )}
      </div>

      <div className={styles.sectors}>
        {deviations.length === 0 && !isLoading ? (
          <p className={styles.emptyHint}>Add holdings to track strategy bucket alignment.</p>
        ) : (
          deviations.map((deviation) => (
            <div key={deviation.bucketId} className={styles.sectorRow}>
              <div className={styles.sectorRowHeader}>
                <div className={styles.sectorNameGroup}>
                  <span
                    className={styles.sectorIcon}
                    style={{ background: deviation.color }}
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
                  style={{
                    width: `${Math.max(deviation.currentPercent, 0)}%`,
                    background: deviation.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
