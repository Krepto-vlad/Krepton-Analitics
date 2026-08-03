import { TrendingUp } from 'lucide-react';
import type { PortfolioStats, EquityDataPoint } from '../../../../types/portfolio.types';
import { EQUITY_PERIODS, ROUTES } from '../../../../constants';
import { useEquityChart } from '../../../../hooks/useEquityChart';
import type { EquityPeriod } from '../../../../hooks/useEquityChart';
import type { Currency } from '../../../../constants';
import { formatMoney, formatSignedMoney } from '../../../../utils/moneyDisplay';
import { DashboardPanelEmptyState } from '../DashboardPanelEmptyState/DashboardPanelEmptyState';
import styles from './PortfolioEquityCard.module.scss';

interface PortfolioEquityCardProps {
  stats: PortfolioStats;
  equityHistory: EquityDataPoint[];
  currency: Currency;
  isLoading?: boolean;
}

export function PortfolioEquityCard({
  stats,
  equityHistory,
  currency,
  isLoading = false,
}: PortfolioEquityCardProps) {
  const { containerRef, selectedPeriod, setSelectedPeriod } = useEquityChart(
    equityHistory,
    '1Y',
    currency
  );

  const isPnlPositive = stats.totalPnl >= 0;
  const isDayPnlPositive = stats.dayPnl >= 0;
  const hasPortfolioData = stats.totalValue > 0 || equityHistory.length > 0;
  // Keep existing chart/stats visible while currency refresh reloads in background.
  const showEmptyState = !isLoading && !hasPortfolioData;
  const showInitialLoading = isLoading && !hasPortfolioData;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <TrendingUp size={13} className={styles.cardLabelIcon} />
          <span className={styles.cardLabel}>PORTFOLIO EQUITY</span>
        </div>
        {hasPortfolioData && (
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
        )}
      </div>

      {showInitialLoading || showEmptyState ? (
        <DashboardPanelEmptyState
          isLoading={showInitialLoading}
          loadingMessage="Loading portfolio equity…"
          icon={<TrendingUp size={24} />}
          title="No equity history yet"
          description="Upload holdings or import a broker report to see portfolio value, P&L, and performance over time."
          actionLabel="Add Position"
          actionTo={`${ROUTES.PORTFOLIO}?section=positions`}
        />
      ) : (
        <>
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
        </>
      )}

      <div
        ref={containerRef}
        className={styles.chartContainer}
        hidden={!hasPortfolioData}
        aria-hidden={!hasPortfolioData}
      />
    </div>
  );
}
