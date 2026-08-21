import { TrendingUp } from 'lucide-react';
import type { PortfolioStats, EquityDataPoint } from '../../../../types/portfolio.types';
import { EQUITY_PERIODS, LOADING_MESSAGES, ROUTES } from '../../../../constants';
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
  // Hide partial/stale numbers while dashboard bootstrap (or currency reload) is in flight.
  const showEmptyState = !isLoading && !hasPortfolioData;
  const showLoadingState = isLoading;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLabelRow}>
          <TrendingUp size={13} className={styles.cardLabelIcon} />
          <span className={styles.cardLabel}>PORTFOLIO EQUITY</span>
        </div>
        <div className={styles.periodSelectorSlot}>
          <div
            className={styles.periodSelector}
            data-ready={hasPortfolioData && !isLoading ? 'true' : 'false'}
            aria-hidden={isLoading || !hasPortfolioData}
          >
            {EQUITY_PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                className={`${styles.periodButton} ${selectedPeriod === period.value ? styles.activePeriod : ''}`}
                onClick={() => setSelectedPeriod(period.value as EquityPeriod)}
                disabled={isLoading || !hasPortfolioData}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showEmptyState ? (
        <DashboardPanelEmptyState
          isLoading={false}
          loadingPreset="chart"
          loadingMessage={LOADING_MESSAGES.PORTFOLIO_EQUITY}
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
              {showLoadingState
                ? '\u00a0'
                : formatMoney(stats.totalValue, currency, {
                    compact: true,
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}
            </span>
            <span
              className={`${styles.totalPnlPercent} ${showLoadingState ? '' : isPnlPositive ? styles.positive : styles.negative}`}
            >
              {showLoadingState
                ? '\u00a0'
                : `${isPnlPositive ? '+' : ''}${stats.totalPnlPercent.toFixed(1)}% YoY`}
            </span>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total P&L</span>
              <span
                className={`${styles.statValue} ${showLoadingState ? '' : isPnlPositive ? styles.positive : styles.negative}`}
              >
                {showLoadingState ? '\u00a0' : formatSignedMoney(stats.totalPnl, currency, true)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Unrealized</span>
              <span
                className={`${styles.statValue} ${showLoadingState ? '' : stats.unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
              >
                {showLoadingState
                  ? '\u00a0'
                  : formatSignedMoney(stats.unrealizedPnl, currency, true)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Realized</span>
              <span
                className={`${styles.statValue} ${showLoadingState ? '' : stats.realizedPnl >= 0 ? styles.positive : styles.negative}`}
              >
                {showLoadingState ? '\u00a0' : formatSignedMoney(stats.realizedPnl, currency, true)}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Day P&L</span>
              <span
                className={`${styles.statValue} ${showLoadingState ? '' : isDayPnlPositive ? styles.positive : styles.negative}`}
              >
                {showLoadingState ? '\u00a0' : formatSignedMoney(stats.dayPnl, currency, true)}
              </span>
            </div>
          </div>
        </>
      )}

      <div
        ref={containerRef}
        className={styles.chartContainer}
        data-chart-ready={hasPortfolioData && !isLoading ? 'true' : 'false'}
        aria-hidden={isLoading || !hasPortfolioData}
      />
    </div>
  );
}
