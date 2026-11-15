import type {
  TickerChatAllocationBarsBlock,
  TickerChatBacktestBarsBlock,
  TickerChatCompareBarsBlock,
  TickerChatDisplayBlock,
  TickerChatMoverBarsBlock,
  TickerChatPayoutBarsBlock,
  TickerChatWeightBarsBlock,
  TickerChatHeadlineListBlock,
} from '../../../types/ai.types';
import styles from './ChatCompareBars.module.scss';

interface ChatCompareBarsProps {
  blocks: TickerChatDisplayBlock[];
}

function formatMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function barWidthPercent(value: number, maxAbsoluteValue: number): number {
  if (maxAbsoluteValue <= 0) {
    return 0;
  }

  return (Math.abs(value) / maxAbsoluteValue) * 100;
}

function CompareCard({ block }: { block: TickerChatCompareBarsBlock }) {
  const finiteValues = block.rows
    .map((row) => row.value)
    .filter((value): value is number => value !== null);
  const maxAbsoluteValue = finiteValues.reduce(
    (maxValue, value) => Math.max(maxValue, Math.abs(value)),
    0
  );

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.ticker} className={styles.row}>
            <span className={styles.ticker}>{row.ticker}</span>
            <span className={styles.track}>
              {row.value !== null && (
                <span
                  className={`${styles.bar} ${row.value < 0 ? styles.barNegative : ''}`}
                  style={{ width: `${barWidthPercent(row.value, maxAbsoluteValue)}%` }}
                />
              )}
            </span>
            <span className={styles.value}>
              {row.value === null
                ? '—'
                : block.unit === 'percent'
                  ? formatPercent(row.value)
                  : formatMultiple(row.value)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AllocationCard({ block }: { block: TickerChatAllocationBarsBlock }) {
  const maxPercent = block.rows.reduce(
    (maxValue, row) => Math.max(maxValue, row.currentPercent, row.targetPercent),
    0
  );

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.label} className={styles.allocationRow}>
            <span className={styles.ticker}>{row.label}</span>
            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{ width: `${barWidthPercent(row.currentPercent, maxPercent)}%` }}
              />
            </span>
            <span className={styles.value}>{formatPercent(row.currentPercent)}</span>
            <span className={styles.track}>
              <span
                className={`${styles.bar} ${styles.barTarget}`}
                style={{ width: `${barWidthPercent(row.targetPercent, maxPercent)}%` }}
              />
            </span>
            <span className={styles.value}>{formatPercent(row.targetPercent)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.legend}>Now, then the selected target.</p>
    </section>
  );
}

function MoverCard({ block }: { block: TickerChatMoverBarsBlock }) {
  if (block.rows.length === 0) {
    return null;
  }

  const maxAbsoluteValue = block.rows.reduce(
    (maxValue, row) => Math.max(maxValue, Math.abs(row.changePercent)),
    0
  );

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.ticker} className={styles.row}>
            <span className={styles.ticker}>{row.ticker}</span>
            <span className={styles.track}>
              <span
                className={`${styles.bar} ${row.changePercent < 0 ? styles.barNegative : ''}`}
                style={{ width: `${barWidthPercent(row.changePercent, maxAbsoluteValue)}%` }}
              />
            </span>
            <span className={styles.value}>{formatSignedPercent(row.changePercent)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BacktestCard({ block }: { block: TickerChatBacktestBarsBlock }) {
  if (block.rows.length === 0) {
    return null;
  }

  const maxAbsoluteValue = block.rows.reduce(
    (maxValue, row) => Math.max(maxValue, Math.abs(row.returnPercent)),
    0
  );

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.label} className={styles.backtestRow}>
            <span className={styles.ticker}>{row.label}</span>
            <span className={styles.track}>
              <span
                className={`${styles.bar} ${row.returnPercent < 0 ? styles.barNegative : ''}`}
                style={{ width: `${barWidthPercent(row.returnPercent, maxAbsoluteValue)}%` }}
              />
            </span>
            <span className={styles.value}>{formatSignedPercent(row.returnPercent)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatPayoutAmount(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PayoutCard({ block }: { block: TickerChatPayoutBarsBlock }) {
  if (block.rows.length === 0) {
    return null;
  }

  const maxAbsoluteValue = block.rows.reduce(
    (maxValue, row) => Math.max(maxValue, Math.abs(row.amount)),
    0
  );

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>
        {block.title} · {block.currency}
      </h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.label} className={styles.payoutRow}>
            <span className={styles.ticker}>{row.label}</span>
            <span className={styles.track}>
              <span
                className={`${styles.bar} ${row.amount < 0 ? styles.barNegative : ''}`}
                style={{ width: `${barWidthPercent(row.amount, maxAbsoluteValue)}%` }}
              />
            </span>
            <span className={styles.value}>{formatPayoutAmount(row.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeightCard({ block }: { block: TickerChatWeightBarsBlock }) {
  if (block.rows.length === 0) {
    return null;
  }

  const maxValue = block.rows.reduce((maxWeight, row) => Math.max(maxWeight, row.weightPercent), 0);

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={row.label} className={styles.backtestRow}>
            <span className={styles.ticker}>{row.label}</span>
            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{ width: `${barWidthPercent(row.weightPercent, maxValue)}%` }}
              />
            </span>
            <span className={styles.value}>{formatPercent(row.weightPercent)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HeadlineList({ block }: { block: TickerChatHeadlineListBlock }) {
  if (block.rows.length === 0) {
    return null;
  }

  return (
    <section className={styles.card} aria-label={block.title}>
      <h3 className={styles.title}>{block.title}</h3>
      <ul className={styles.rows}>
        {block.rows.map((row) => (
          <li key={`${row.ticker}-${row.headline}`} className={styles.headline}>
            <span className={styles.ticker}>{row.ticker}</span>
            <span className={styles.headlineText}>{row.headline}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChatCompareBars({ blocks }: ChatCompareBarsProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={styles.cards}>
      {blocks.map((block, index) => {
        if (block.kind === 'compare-bars') {
          return <CompareCard key={`${block.metricKey}-${index}`} block={block} />;
        }

        if (block.kind === 'allocation-bars') {
          return <AllocationCard key={`${block.title}-${index}`} block={block} />;
        }

        if (block.kind === 'backtest-bars') {
          return <BacktestCard key={`${block.title}-${index}`} block={block} />;
        }

        if (block.kind === 'payout-bars') {
          return <PayoutCard key={`${block.title}-${index}`} block={block} />;
        }

        if (block.kind === 'weight-bars') {
          return <WeightCard key={`${block.title}-${index}`} block={block} />;
        }

        if (block.kind === 'headline-list') {
          return <HeadlineList key={`${block.title}-${index}`} block={block} />;
        }

        return <MoverCard key={`${block.side}-${index}`} block={block} />;
      })}
    </div>
  );
}
