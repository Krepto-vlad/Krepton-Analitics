import { Link } from 'react-router-dom';
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import type { Currency } from '../../../../constants';
import {
  buildTickerDetailPath,
  DASHBOARD_CARD_LINKS,
  DASHBOARD_ROW_NAVIGATION_ATTRIBUTE,
  LOADING_MESSAGES,
  PORTFOLIO_POSITIONS_PATH,
} from '../../../../constants';
import type { PortfolioPosition } from '../../../../types/portfolio.types';
import { formatMoney, formatSignedMoney } from '../../../../utils/moneyDisplay';
import { useCardNavigation } from '../../../../hooks/useCardNavigation';
import { TickerAvatar } from '../../../../components/ui';
import { CardCornerLink } from '../../../../components/CardCornerLink/CardCornerLink';
import { PanelEmptyState } from '../../../../components/PanelEmptyState/PanelEmptyState';
import styles from './PositionsTable.module.scss';

interface PositionsTableProps {
  positions: PortfolioPosition[];
  currency: Currency;
  isLoading?: boolean;
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

function formatPnlAmount(value: number, currency: Currency): string {
  return formatSignedMoney(value, currency);
}

function formatPnlPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function PositionsTable({ positions, currency, isLoading = false }: PositionsTableProps) {
  const computedPositions = computePositions(positions);
  const isEmpty = !isLoading && computedPositions.length === 0;
  const isNavigable = !isLoading && !isEmpty;
  const handleCardClick = useCardNavigation(isNavigable ? DASHBOARD_CARD_LINKS.positions.to : null);

  return (
    <div
      className={`${styles.card} ${isNavigable ? styles.cardClickable : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardLabel}>ACTIVE POSITIONS</span>
          <span className={styles.cardTitle}>Transactions &amp; P&amp;L Matrix</span>
        </div>
      </div>

      {isLoading || isEmpty ? (
        <PanelEmptyState
          isLoading={isLoading}
          loadingPreset="table"
          loadingMessage={LOADING_MESSAGES.PORTFOLIO_POSITIONS}
          icon={<Briefcase size={24} />}
          title="No positions yet"
          description="You haven't added any holdings yet. Add a position or import a broker report to track your P&L here."
          actionLabel="Add Position"
          actionTo={PORTFOLIO_POSITIONS_PATH}
        />
      ) : (
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
                  <tr
                    key={position.id}
                    className={styles.row}
                    {...{
                      [DASHBOARD_ROW_NAVIGATION_ATTRIBUTE]: buildTickerDetailPath(position.ticker),
                    }}
                  >
                    <td className={styles.td}>
                      <Link
                        to={buildTickerDetailPath(position.ticker)}
                        className={styles.tickerCellLink}
                      >
                        <div className={styles.tickerCell}>
                          <TickerAvatar
                            ticker={position.ticker}
                            logoUrl={position.logoUrl}
                            size="sm"
                          />
                          <div className={styles.tickerInfo}>
                            <span className={styles.tickerSymbol}>{position.ticker}</span>
                            <span className={styles.companyName}>{position.companyName}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.dateText}>{formatDate(position.entryDate)}</span>
                    </td>
                    <td className={`${styles.td} ${styles.alignRight}`}>
                      <span className={styles.priceText}>
                        {formatMoney(position.avgBuyPrice, currency)}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.alignRight}`}>
                      <span className={styles.priceText}>
                        {formatMoney(position.currentPrice, currency)}
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
      )}

      {isNavigable ? (
        <CardCornerLink
          to={DASHBOARD_CARD_LINKS.positions.to}
          label={DASHBOARD_CARD_LINKS.positions.label}
        />
      ) : null}
    </div>
  );
}
