import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { SectorAllocation } from '../../../../types/portfolio.types';
import styles from './PortfolioHealthCard.module.scss';

interface PortfolioHealthCardProps {
  score: number;
  sectors: SectorAllocation[];
}

const GAUGE_CX = 100;
const GAUGE_CY = 115;
const GAUGE_RADIUS = 82;
const GAUGE_STROKE_WIDTH = 10;

function getRiskLabel(score: number): string {
  if (score <= 40) return 'Low Risk';
  if (score <= 65) return 'Medium Risk';
  return 'High Risk';
}

function getRiskColor(score: number): string {
  if (score <= 40) return '#10b981';
  if (score <= 65) return '#f59e0b';
  return '#ef4444';
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

export function PortfolioHealthCard({ score, sectors }: PortfolioHealthCardProps) {
  const riskLabel = getRiskLabel(score);
  const riskColor = getRiskColor(score);
  const bgArcPath = `M ${GAUGE_CX - GAUGE_RADIUS} ${GAUGE_CY} A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_CX + GAUGE_RADIUS} ${GAUGE_CY}`;
  const progressArcPath = buildGaugeArcPath(score);

  const isHighRisk = score > 65 && sectors.length > 0;
  const topSector =
    sectors.length > 0
      ? sectors.reduce((max, s) => (s.percentage > max.percentage ? s : max), sectors[0])
      : null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <ShieldAlert size={13} />
          <span className={styles.cardLabel}>PORTFOLIO HEALTH</span>
        </div>
        <div className={styles.titleRow}>
          <span className={styles.cardTitle}>Risk Score</span>
          <span className={styles.riskBadge} style={{ color: riskColor, borderColor: riskColor }}>
            {riskLabel}
          </span>
        </div>
      </div>

      {/* gauge + alert centered vertically */}
      <div className={styles.gaugeSection}>
        <svg
          viewBox="0 0 200 125"
          className={styles.gaugeSvg}
          aria-label={`Risk score gauge: ${score} out of 100`}
        >
          <path
            d={bgArcPath}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={GAUGE_STROKE_WIDTH}
            strokeLinecap="round"
          />
          {progressArcPath && (
            <path
              d={progressArcPath}
              fill="none"
              stroke={riskColor}
              strokeWidth={GAUGE_STROKE_WIDTH}
              strokeLinecap="round"
            />
          )}
          {/* score number colored by risk */}
          <text
            x={GAUGE_CX}
            y={GAUGE_CY - 22}
            textAnchor="middle"
            fill={riskColor}
            fontSize="34"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {score}
          </text>
          {/* /100 stays grey */}
          <text
            x={GAUGE_CX}
            y={GAUGE_CY - 4}
            textAnchor="middle"
            fill="#8a8a96"
            fontSize="13"
            fontFamily="Inter, sans-serif"
          >
            / 100
          </text>
        </svg>

        {isHighRisk && topSector && (
          <div className={styles.alertBanner}>
            <AlertTriangle size={13} className={styles.alertIcon} />
            <span>
              <span className={styles.alertHighlight}>High concentration</span>
              <span className={styles.alertBody}>
                {' '}
                in {topSector.sector} ({topSector.percentage}%). Diversification recommended.
              </span>
            </span>
          </div>
        )}
      </div>

      <div className={styles.sectors}>
        {sectors.map((sector) => (
          <div key={sector.sector} className={styles.sectorRow}>
            <div className={styles.sectorRowHeader}>
              <div className={styles.sectorNameGroup}>
                <span
                  className={styles.sectorIcon}
                  style={{ background: sector.color }}
                  aria-hidden="true"
                />
                <span className={styles.sectorName}>{sector.sector}</span>
              </div>
              <span className={styles.sectorPercent}>{sector.percentage}%</span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${sector.percentage}%`, background: sector.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
