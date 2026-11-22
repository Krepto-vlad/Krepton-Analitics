import { HandCoins, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, TickerAvatar } from '../../../../components/ui';
import { buildTickerDetailPath, OUTSIDE_ANALYSIS_ANALYZED_EMPTY } from '../../../../constants';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import { formatMoneyWhole } from '../../../../utils/moneyDisplay';
import { formatPercent, formatPnl, formatUsdDecimal } from './positionsPanelFormat';
import styles from './PositionsPanel.module.scss';

interface HoldingsTableProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onAddPosition: () => void;
  sortField: 'marketValue' | 'pnlAbs' | 'pnlPct';
  onSort: (field: 'marketValue' | 'pnlAbs' | 'pnlPct') => void;
  hasNoHoldingsSearchMatches: boolean;
  rows: Array<{
    id: string;
    ticker: string;
    companyName: string;
    sector: string | null;
    shares: number;
    avgBuyPrice: number;
    currentPrice: number;
    marketValue: number;
    pnlAbs: number;
    pnlPct: number;
    logoUrl?: string | null;
  }>;
  showOutsideEmptyState: boolean;
  logoByTicker: Record<string, string | null>;
  displayCurrency: import('../../../../constants').Currency;
  onClosePosition: (positionId: string) => void;
  onDeletePosition: (positionId: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  minHeightPx: number;
}

export function HoldingsTable({
  searchQuery,
  onSearchQueryChange,
  onAddPosition,
  sortField,
  onSort,
  hasNoHoldingsSearchMatches,
  rows,
  showOutsideEmptyState,
  logoByTicker,
  displayCurrency,
  onClosePosition,
  onDeletePosition,
  hasMore,
  isLoadingMore,
  onLoadMore,
  minHeightPx,
}: HoldingsTableProps) {
  return (
    <div className={styles.holdingsSection}>
      <div className={styles.holdingsHeader}>
        <h2 className={styles.holdingsTitle}>Holdings</h2>
        <div className={styles.holdingsActions}>
          <div className={styles.searchWrapper}>
            <Search size={13} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className={styles.searchInput}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={12} />}
            onClick={() => onAddPosition()}
          >
            Add Position
          </Button>
        </div>
      </div>

      <div
        className={styles.tableWrapper}
        style={toCssCustomProperties({ '--table-min-height': `${minHeightPx}px` })}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thTicker}>TICKER</th>
              <th className={styles.thName}>NAME</th>
              <th className={styles.thNum}>SHARES</th>
              <th className={styles.thNum}>AVG COST</th>
              <th className={styles.thNum}>CURRENT PRICE</th>
              <th
                className={`${styles.thNum} ${styles.sortable} ${sortField === 'marketValue' ? styles.sortActive : ''}`}
                onClick={() => onSort('marketValue')}
              >
                MARKET VALUE ↕
              </th>
              <th
                className={`${styles.thNum} ${styles.sortable} ${sortField === 'pnlAbs' ? styles.sortActive : ''}`}
                onClick={() => onSort('pnlAbs')}
              >
                P&amp;L ↕
              </th>
              <th
                className={`${styles.thNum} ${styles.sortable} ${sortField === 'pnlPct' ? styles.sortActive : ''}`}
                onClick={() => onSort('pnlPct')}
              >
                % ↕
              </th>
              <th className={styles.thActions}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {hasNoHoldingsSearchMatches ? (
              <tr className={styles.filterEmptyRow}>
                <td colSpan={9}>
                  <div className={styles.filterEmptyState}>
                    <p className={styles.filterEmptyTitle}>No matching holdings</p>
                    <p className={styles.filterEmptyText}>
                      Nothing matches “{searchQuery.trim()}”. Try another ticker or company name.
                    </p>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 && showOutsideEmptyState ? (
              <tr className={styles.filterEmptyRow}>
                <td colSpan={9}>
                  <div className={styles.filterEmptyState}>
                    <p className={styles.filterEmptyText}>{OUTSIDE_ANALYSIS_ANALYZED_EMPTY}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((position) => {
                const sectorLabel = position.sector ?? 'Other';
                const isPnlPositive = position.pnlAbs >= 0;
                const normalizedTicker = position.ticker.toUpperCase();

                return (
                  <tr key={position.id} className={styles.tableRow}>
                    <td className={styles.tdTicker}>
                      <Link
                        to={buildTickerDetailPath(normalizedTicker)}
                        className={styles.tickerLink}
                      >
                        <TickerAvatar
                          ticker={normalizedTicker}
                          logoUrl={position.logoUrl ?? logoByTicker[normalizedTicker] ?? null}
                          size="sm"
                        />
                        <span className={styles.tickerSymbol}>{position.ticker}</span>
                      </Link>
                    </td>
                    <td className={styles.tdName}>
                      <p className={styles.companyName}>{position.companyName}</p>
                      <p className={styles.sectorLabel}>{sectorLabel}</p>
                    </td>
                    <td className={styles.tdNum}>{position.shares}</td>
                    <td className={styles.tdNum}>
                      {formatUsdDecimal(position.avgBuyPrice, displayCurrency)}
                    </td>
                    <td className={styles.tdNum}>
                      {formatUsdDecimal(position.currentPrice, displayCurrency)}
                    </td>
                    <td className={styles.tdNum}>
                      {formatMoneyWhole(position.marketValue, displayCurrency)}
                    </td>
                    <td
                      className={`${styles.tdNum} ${isPnlPositive ? styles.positive : styles.negative}`}
                    >
                      {formatPnl(position.pnlAbs, displayCurrency)}
                    </td>
                    <td
                      className={`${styles.tdNum} ${isPnlPositive ? styles.positive : styles.negative}`}
                    >
                      {formatPercent(position.pnlPct)}
                    </td>
                    <td className={styles.tdActions}>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnClose}`}
                        title="Close Position (Sell)"
                        onClick={() => onClosePosition(position.id)}
                      >
                        <HandCoins size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Delete position"
                        onClick={() => onDeletePosition(position.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className={styles.loadMoreRow}>
          <Button variant="outline" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
