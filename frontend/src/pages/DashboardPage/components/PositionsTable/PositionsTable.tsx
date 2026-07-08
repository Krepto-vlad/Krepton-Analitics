import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import type { PortfolioPosition } from '../../../../types/portfolio.types';
import styles from './PositionsTable.module.scss';

interface PositionsTableProps {
  positions: PortfolioPosition[];
  currency: string;
}

interface ComputedPosition extends PortfolioPosition {
  pnlAmount: number;
  pnlPercent: number;
}

function computePositions(positions: PortfolioPosition[]): ComputedPosition[] {
  return positions.map((position) => {
    const pnlAmount = (position.currentPrice - position.avgBuyPrice) * position.shares;
    const pnlPercent =
      ((position.currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100;
    return { ...position, pnlAmount, pnlPercent };
  });
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPnlAmount(value: number, currency: string): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPnlPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function PositionsTable({ positions, currency }: PositionsTableProps) {
  const computedPositions = computePositions(positions);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardLabel}>ACTIVE POSITIONS</span>
          <span className={styles.cardTitle}>Transactions &amp; P&amp;L Matrix</span>
        </div>
        <button className={styles.addButton} title="Add position">
          <Plus size={14} />
          <span>Add Position</span>
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>TICKER</th>
              <th className={styles.th}>ENTRY DATE</th>
              <th className={`${styles.th} ${styles.alignRight}`}>ENTRY PRICE</th>
              <th className={`${styles.th} ${styles.alignRight}`}>CURRENT</th>
              <th className={`${styles.th} ${styles.alignRight}`}>SIZE</th>
              <th className={`${styles.th} ${styles.alignRight}`}>P&amp;L</th>
              <th className={`${styles.th} ${styles.alignRight}`}>P&amp;L %</th>
            </tr>
          </thead>
          <tbody>
            {computedPositions.map((position) => {
              const isPositive = position.pnlAmount >= 0;
              return (
                <tr key={position.id} className={styles.row}>
                  <td className={styles.td}>
                    <div className={styles.tickerCell}>
                      <div className={styles.tickerAvatar}>{position.ticker.slice(0, 2)}</div>
                      <div className={styles.tickerInfo}>
                        <span className={styles.tickerSymbol}>${position.ticker}</span>
                        <span className={styles.companyName}>{position.companyName}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.dateText}>{formatDate(position.entryDate)}</span>
                  </td>
                  <td className={`${styles.td} ${styles.alignRight}`}>
                    <span className={styles.priceText}>
                      {formatPrice(position.avgBuyPrice, currency)}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.alignRight}`}>
                    <span className={styles.priceText}>
                      {formatPrice(position.currentPrice, currency)}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.alignRight}`}>
                    <span className={styles.sharesText}>{position.shares}</span>
                  </td>
                  <td className={`${styles.td} ${styles.alignRight}`}>
                    <div
                      className={`${styles.pnlCell} ${isPositive ? styles.positive : styles.negative}`}
                    >
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{formatPnlAmount(position.pnlAmount, currency)}</span>
                    </div>
                  </td>
                  <td className={`${styles.td} ${styles.alignRight}`}>
                    <span
                      className={`${styles.pnlPercent} ${isPositive ? styles.positive : styles.negative}`}
                    >
                      {formatPnlPercent(position.pnlPercent)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
