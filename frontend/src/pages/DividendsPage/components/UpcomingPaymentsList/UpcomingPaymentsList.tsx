import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildTickerDetailPath, type Currency } from '../../../../constants';
import { TickerAvatar } from '../../../../components/ui';
import type { DividendCalendarPayment } from '../../../../types/dividend.types';
import { formatMoney } from '../../../../utils/moneyDisplay';
import styles from './UpcomingPaymentsList.module.scss';

interface UpcomingPaymentsListProps {
  payments: DividendCalendarPayment[];
  displayCurrency: Currency;
  logoByTicker?: Record<string, string | null>;
}

function formatPaymentDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function UpcomingPaymentsList({
  payments,
  displayCurrency,
  logoByTicker = {},
}: UpcomingPaymentsListProps) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <CalendarDays size={16} className={styles.headerIcon} />
        <h2 className={styles.title}>Upcoming Payments</h2>
      </div>

      {payments.length === 0 ? (
        <p className={styles.emptyState}>
          No upcoming dividend payments found for your current holdings.
        </p>
      ) : (
        <ul className={styles.list}>
          {payments.map((payment) => {
            const isCoupon = payment.paymentType === 'coupon';
            const textToneClass = isCoupon ? styles.textCoupon : styles.textDividend;
            const normalizedTicker = payment.ticker.toUpperCase();

            return (
              <li key={`${payment.ticker}-${payment.paymentDate}`}>
                <Link
                  to={buildTickerDetailPath(normalizedTicker)}
                  className={styles.row}
                  aria-label={`Open ${payment.ticker} details`}
                >
                  <div className={styles.asset}>
                    <TickerAvatar
                      ticker={normalizedTicker}
                      logoUrl={logoByTicker[normalizedTicker] ?? null}
                      size="md"
                    />
                    <div className={styles.assetMeta}>
                      <span className={styles.ticker}>{payment.ticker}</span>
                      <span className={`${styles.paymentType} ${textToneClass}`}>
                        {isCoupon ? 'Coupon' : 'Dividend'}
                        {payment.isProjected ? ' · projected' : ''}
                      </span>
                    </div>
                  </div>
                  <div className={styles.amountBlock}>
                    <span className={`${styles.amount} ${textToneClass}`}>
                      {formatMoney(payment.totalAmount, displayCurrency)}
                    </span>
                    <span className={styles.perShare}>
                      {formatMoney(payment.amountPerShare, displayCurrency)}/sh
                    </span>
                    <span className={styles.date}>{formatPaymentDate(payment.paymentDate)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
