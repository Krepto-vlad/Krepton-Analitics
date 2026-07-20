import { CalendarDays } from 'lucide-react';
import type { Currency } from '../../../../constants';
import type { DividendCalendarPayment } from '../../../../types/dividend.types';
import { formatMoney } from '../../../../utils/moneyDisplay';
import styles from './UpcomingPaymentsList.module.scss';

interface UpcomingPaymentsListProps {
  payments: DividendCalendarPayment[];
  displayCurrency: Currency;
}

function formatPaymentDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function getTickerInitials(ticker: string): string {
  return ticker.slice(0, 2).toUpperCase();
}

export function UpcomingPaymentsList({ payments, displayCurrency }: UpcomingPaymentsListProps) {
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
            const avatarToneClass = isCoupon ? styles.avatarCoupon : styles.avatarDividend;
            const textToneClass = isCoupon ? styles.textCoupon : styles.textDividend;

            return (
              <li key={`${payment.ticker}-${payment.paymentDate}`} className={styles.row}>
                <div className={styles.asset}>
                  <span className={`${styles.avatar} ${avatarToneClass}`}>
                    {getTickerInitials(payment.ticker)}
                  </span>
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
