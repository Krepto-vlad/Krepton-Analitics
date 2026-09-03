import type { Currency } from '../../../../constants';
import type { DividendCalendarSummary } from '../../../../types/dividend.types';
import { formatMoneyWhole } from '../../../../utils/moneyDisplay';
import styles from './DividendSummaryCards.module.scss';

interface DividendSummaryCardsProps {
  summary: DividendCalendarSummary;
  displayCurrency: Currency;
}

interface SummaryCardConfig {
  label: string;
  sublabel: string;
  value: number;
  tone: 'green' | 'blue' | 'yellow';
}

export function DividendSummaryCards({ summary, displayCurrency }: DividendSummaryCardsProps) {
  const cards: SummaryCardConfig[] = [
    {
      label: 'Annual Income',
      sublabel: 'Projected',
      value: summary.annualIncome,
      tone: 'green',
    },
    {
      label: 'Avg Monthly',
      sublabel: '12-mo avg',
      value: summary.avgMonthlyIncome,
      tone: 'blue',
    },
    {
      label: 'Remaining Year',
      sublabel: 'From now',
      value: summary.remainingYearIncome,
      tone: 'yellow',
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <article key={card.label} className={styles.card}>
          <span className={styles.label}>{card.label}</span>
          <span className={`${styles.value} ${styles[card.tone]}`}>
            {formatMoneyWhole(card.value, displayCurrency)}
          </span>
          <span className={styles.sublabel}>{card.sublabel}</span>
        </article>
      ))}
    </div>
  );
}
