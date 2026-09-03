import { LineChart } from 'lucide-react';
import type { Currency } from '../../../../constants';
import type { DividendCalendarMonth } from '../../../../types/dividend.types';
import { formatMoneyWhole } from '../../../../utils/moneyDisplay';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import styles from './DividendMonthlyChart.module.scss';

interface DividendMonthlyChartProps {
  chartYear: number;
  monthlyPayouts: DividendCalendarMonth[];
  displayCurrency: Currency;
}

function normalizeBarHeight(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return value > 0 ? 100 : 4;
  }
  const normalized = (Math.max(value, 0) / maxValue) * 100;
  return Math.max(normalized, value > 0 ? 8 : 4);
}

export function DividendMonthlyChart({
  chartYear,
  monthlyPayouts,
  displayCurrency,
}: DividendMonthlyChartProps) {
  const currentMonth = new Date().getMonth() + 1;
  const maxValue = Math.max(...monthlyPayouts.map((month) => month.total), 1);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <LineChart size={16} className={styles.titleIcon} />
          <h2 className={styles.title}>Monthly Payouts — {chartYear}</h2>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendSwatchDividend}`} />
            Dividends
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendSwatchCoupon}`} />
            Coupons
          </span>
        </div>
      </div>

      <div className={styles.plotWrapper}>
        <div className={styles.gridLines}>
          {[0, 1, 2, 3, 4].map((step) => (
            <div key={step} className={styles.gridLine} />
          ))}
        </div>
        <div className={styles.plot}>
          {monthlyPayouts.map((month) => {
            const dividendHeight = normalizeBarHeight(month.dividendTotal, maxValue);
            const couponHeight = normalizeBarHeight(month.couponTotal, maxValue);
            const stackedHeight = Math.max(dividendHeight + couponHeight, 1);
            const isCurrentMonth = month.month === currentMonth;

            return (
              <div key={month.label} className={styles.barGroup}>
                <span className={styles.barValue}>
                  {month.total > 0 ? formatMoneyWhole(month.total, displayCurrency) : '—'}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.stackedBar} ${month.isProjected ? styles.projected : styles.historical}`}
                    style={toCssCustomProperties({
                      '--bar-height': `${normalizeBarHeight(month.total, maxValue)}%`,
                    })}
                  >
                    {month.couponTotal > 0 && (
                      <div
                        className={styles.couponSegment}
                        style={toCssCustomProperties({
                          '--coupon-share': `${(couponHeight / stackedHeight) * 100}%`,
                        })}
                      />
                    )}
                    {month.dividendTotal > 0 && <div className={styles.dividendSegment} />}
                  </div>
                </div>
                <span className={styles.barLabel}>
                  {month.label}
                  {isCurrentMonth && <span className={styles.currentDot} />}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className={styles.hint}>Opaque bars = projected · Faded bars = historical payouts</p>
    </section>
  );
}
