import { TrendingUp } from 'lucide-react';
import type { PortfolioStats, EquityDataPoint } from '../../../../types/portfolio.types';
import {
  DASHBOARD_CARD_LINKS,
  DASHBOARD_CARD_NAVIGATION_IGNORE_ATTRIBUTE,
  EQUITY_PERIODS,
  LOADING_MESSAGES,
  PORTFOLIO_POSITIONS_PATH,
} from '../../../../constants';
import { useCardNavigation } from '../../../../hooks/useCardNavigation';
import { useEquityChart } from '../../../../hooks/useEquityChart';
import type { EquityPeriod } from '../../../../hooks/useEquityChart';
import type { Currency } from '../../../../constants';
import { formatMoney, formatSignedMoney } from '../../../../utils/moneyDisplay';
import { DashboardCardLink } from '../DashboardCardLink/DashboardCardLink';
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
  const isNavigable = hasPortfolioData && !isLoading;
  const handleCardClick = useCardNavigation(isNavigable ? DASHBOARD_CARD_LINKS.equity.to : null);
  const showLoadingState = isLoading;

  return (
    <div
      className={`${styles.card} ${isNavigable ? styles.cardClickable : ''}`}
      onClick={handleCardClick}
    >
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
          actionTo={PORTFOLIO_POSITIONS_PATH}
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
        {...{ [DASHBOARD_CARD_NAVIGATION_IGNORE_ATTRIBUTE]: '' }}
        data-chart-ready={hasPortfolioData && !isLoading ? 'true' : 'false'}
        aria-hidden={isLoading || !hasPortfolioData}
      />

      {isNavigable ? (
        <DashboardCardLink
          to={DASHBOARD_CARD_LINKS.equity.to}
          label={DASHBOARD_CARD_LINKS.equity.label}
        />
      ) : null}
    </div>
  );
}
