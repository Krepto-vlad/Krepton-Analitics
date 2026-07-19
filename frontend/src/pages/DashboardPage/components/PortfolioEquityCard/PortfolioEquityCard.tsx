import { TrendingUp } from 'lucide-react';
import type { PortfolioStats, EquityDataPoint } from '../../../../types/portfolio.types';
import { EQUITY_PERIODS } from '../../../../constants';
import { useEquityChart } from '../../../../hooks/useEquityChart';
import type { EquityPeriod } from '../../../../hooks/useEquityChart';
import type { Currency } from '../../../../constants';
import { formatMoney, formatSignedMoney } from '../../../../utils/moneyDisplay';
import styles from './PortfolioEquityCard.module.scss';

interface PortfolioEquityCardProps {
  stats: PortfolioStats;
  equityHistory: EquityDataPoint[];
  currency: Currency;
}

export function PortfolioEquityCard({ stats, equityHistory, currency }: PortfolioEquityCardProps) {
  const { containerRef, selectedPeriod, setSelectedPeriod } = useEquityChart(
    equityHistory,
    '1Y',
    currency
  );

  const isPnlPositive = stats.totalPnl >= 0;
  const isDayPnlPositive = stats.dayPnl >= 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <TrendingUp size={13} className={styles.cardLabelIcon} />
          <span className={styles.cardLabel}>PORTFOLIO EQUITY</span>
        </div>
        <div className={styles.periodSelector}>
          {EQUITY_PERIODS.map((period) => (
            <button
              key={period.value}
              className={`${styles.periodButton} ${selectedPeriod === period.value ? styles.activePeriod : ''}`}
              onClick={() => setSelectedPeriod(period.value as EquityPeriod)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.totalValue}>
          {formatMoney(stats.totalValue, currency, {
            compact: true,
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          })}
        </span>
        <span
          className={`${styles.totalPnlPercent} ${isPnlPositive ? styles.positive : styles.negative}`}
        >
          {isPnlPositive ? '+' : ''}
          {stats.totalPnlPercent.toFixed(1)}% YoY
        </span>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total P&L</span>
          <span
            className={`${styles.statValue} ${isPnlPositive ? styles.positive : styles.negative}`}
          >
            {formatSignedMoney(stats.totalPnl, currency, true)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Unrealized</span>
          <span
            className={`${styles.statValue} ${stats.unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatSignedMoney(stats.unrealizedPnl, currency, true)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Realized</span>
          <span
            className={`${styles.statValue} ${stats.realizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatSignedMoney(stats.realizedPnl, currency, true)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Day P&L</span>
          <span
            className={`${styles.statValue} ${isDayPnlPositive ? styles.positive : styles.negative}`}
          >
            {formatSignedMoney(stats.dayPnl, currency, true)}
          </span>
        </div>
      </div>

      <div ref={containerRef} className={styles.chartContainer} />
    </div>
  );
}
