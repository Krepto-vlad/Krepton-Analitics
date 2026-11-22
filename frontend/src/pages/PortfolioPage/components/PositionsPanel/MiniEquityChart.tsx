import { TrendingUp } from 'lucide-react';
import { EQUITY_PERIODS, type Currency } from '../../../../constants';
import {
  useEquityChart,
  formatChartPrice,
  type EquityPeriod,
} from '../../../../hooks/useEquityChart';
import type { EquityDataPoint } from '../../../../types/portfolio.types';
import styles from './PositionsPanel.module.scss';

interface MiniEquityChartProps {
  equityHistory: EquityDataPoint[];
  totalPnl: number;
  totalInvested: number;
  currency: Currency;
}

export function MiniEquityChart({
  equityHistory,
  totalPnl,
  totalInvested,
  currency,
}: MiniEquityChartProps) {
  const { containerRef, selectedPeriod, setSelectedPeriod, currentValue } = useEquityChart(
    equityHistory,
    '1Y',
    currency
  );

  const returnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isPositive = totalPnl >= 0;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartCardHeader}>
        <div>
          <p className={styles.chartCardLabel}>
            <TrendingUp size={12} />
            PORTFOLIO VALUE OVER TIME
          </p>
          <p className={styles.chartCardValue}>{formatChartPrice(currentValue, currency)}</p>
        </div>
        <span
          className={`${styles.chartChangeBadge} ${isPositive ? styles.positive : styles.negative}`}
        >
          {isPositive ? '+' : ''}
          {returnPct.toFixed(2)}%
        </span>
      </div>

      <div className={styles.periodSelector}>
        {EQUITY_PERIODS.map((period) => (
          <button
            key={period.value}
            className={`${styles.periodButton} ${selectedPeriod === period.value ? styles.periodButtonActive : ''}`}
            onClick={() => setSelectedPeriod(period.value as EquityPeriod)}
          >
            {period.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className={styles.chartContainer} />
    </div>
  );
}
