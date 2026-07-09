import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, HandCoins, Search, TrendingUp, ArrowUpDown, Loader } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { EQUITY_PERIODS } from '../../../../constants';
import { useEquityChart, formatChartPrice } from '../../../../hooks/useEquityChart';
import type { EquityPeriod } from '../../../../hooks/useEquityChart';
import type {
  EquityDataPoint,
  PortfolioPosition,
  PortfolioTransaction,
} from '../../../../types/portfolio.types';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
  fetchPortfolioEquityHistoryThunk,
  deletePositionThunk,
  deleteBuyTransactionThunk,
} from '../../../../features/portfolio/portfolioSlice';
import { AddPositionModal } from '../AddPositionModal/AddPositionModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal/DeleteConfirmModal';
import { ClosePositionModal } from '../ClosePositionModal/ClosePositionModal';
import styles from './PositionsPanel.module.scss';

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
  '#3b82f6',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
] as const;

type SortField = 'marketValue' | 'pnlAbs' | 'pnlPct';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsdDecimal(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function formatPnl(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatUsd(value)}`;
}

function formatTransactionDate(transaction: PortfolioTransaction): string {
  const fallback = transaction.createdAt.slice(0, 10);
  const raw = transaction.transactionDate ?? fallback;

  let normalized = fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    normalized = raw;
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      normalized = parsed.toISOString().slice(0, 10);
    }
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface SectorAllocationSlice {
  sector: string;
  percentage: number;
  displayPercentage: number;
  color: string;
}

/**
 * Distributes integer display percentages that always sum to 100
 * using the largest-remainder method (avoids 100% + 0% when a small sector exists).
 */
function buildSectorAllocations(
  positions: Array<{ sector: string | null; marketValue: number }>,
  totalMarketValue: number
): SectorAllocationSlice[] {
  if (totalMarketValue === 0) return [];

  const sectorMap: Record<string, number> = {};
  positions.forEach((position) => {
    const sector = position.sector ?? 'Other';
    sectorMap[sector] = (sectorMap[sector] ?? 0) + position.marketValue;
  });

  const entries = Object.entries(sectorMap).sort(([, valueA], [, valueB]) => valueB - valueA);

  const slices = entries.map(([sector, value], index) => {
    const exactPercentage = (value / totalMarketValue) * 100;
    return {
      sector,
      percentage: exactPercentage,
      displayPercentage: Math.floor(exactPercentage),
      remainder: exactPercentage - Math.floor(exactPercentage),
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
    };
  });

  let remainingPoints = 100 - slices.reduce((sum, slice) => sum + slice.displayPercentage, 0);
  const rankedByRemainder = [...slices].sort((a, b) => b.remainder - a.remainder);

  for (let index = 0; index < rankedByRemainder.length && remainingPoints > 0; index += 1) {
    rankedByRemainder[index].displayPercentage += 1;
    remainingPoints -= 1;
  }

  return slices.map((slice) => ({
    sector: slice.sector,
    percentage: slice.percentage,
    displayPercentage: slice.displayPercentage,
    color: slice.color,
  }));
}

// ─── Mini equity chart ────────────────────────────────────────────────────────

interface MiniEquityChartProps {
  equityHistory: EquityDataPoint[];
  totalPnl: number;
  totalInvested: number;
}

function MiniEquityChart({ equityHistory, totalPnl, totalInvested }: MiniEquityChartProps) {
  const { containerRef, selectedPeriod, setSelectedPeriod, currentValue } = useEquityChart(
    equityHistory,
    '1Y'
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
          <p className={styles.chartCardValue}>{formatChartPrice(currentValue)}</p>
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

// ─── Donut chart ──────────────────────────────────────────────────────────────

interface DonutChartProps {
  sectors: SectorAllocationSlice[];
}

function DonutChart({ sectors }: DonutChartProps) {
  const cx = 90;
  const cy = 90;
  const radius = 72;
  const innerRadius = 48;
  const ringRadius = (radius + innerRadius) / 2;
  const ringWidth = radius - innerRadius;

  const chartSectors = sectors.filter((sector) => sector.percentage > 0);

  // SVG arc cannot represent a full 360° path (start = end → degenerate).
  const isSingleFullSector = chartSectors.length === 1;

  if (isSingleFullSector) {
    return (
      <div className={styles.allocationCard}>
        <p className={styles.allocationTitle}>SECTOR ALLOCATION</p>
        <div className={styles.allocationBody}>
          <svg width={180} height={180} viewBox="0 0 180 180" className={styles.donutSvg}>
            <circle
              cx={cx}
              cy={cy}
              r={ringRadius}
              stroke={chartSectors[0].color}
              strokeWidth={ringWidth}
              fill="none"
              opacity={0.9}
            />
          </svg>
          <ul className={styles.allocationLegend}>
            {sectors.map((sector) => (
              <li key={sector.sector} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: sector.color }} />
                <span className={styles.legendLabel}>{sector.sector}</span>
                <span className={styles.legendValue}>{sector.displayPercentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const slices = chartSectors.reduce<Array<SectorAllocationSlice & { path: string }>>(
    (acc, sector) => {
      const startPercent = acc.reduce((sum, slice) => sum + slice.percentage, 0);
      const endPercent = startPercent + sector.percentage;

      const startAngle = (startPercent / 100) * 360 - 90;
      const endAngle = (endPercent / 100) * 360 - 90;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const ix1 = cx + innerRadius * Math.cos(startRad);
      const iy1 = cy + innerRadius * Math.sin(startRad);
      const ix2 = cx + innerRadius * Math.cos(endRad);
      const iy2 = cy + innerRadius * Math.sin(endRad);

      const largeArc = sector.percentage > 50 ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      return [...acc, { ...sector, path }];
    },
    []
  );

  return (
    <div className={styles.allocationCard}>
      <p className={styles.allocationTitle}>SECTOR ALLOCATION</p>
      <div className={styles.allocationBody}>
        <svg width={180} height={180} viewBox="0 0 180 180" className={styles.donutSvg}>
          {slices.map((slice) => (
            <path key={slice.sector} d={slice.path} fill={slice.color} opacity={0.9} />
          ))}
        </svg>
        <ul className={styles.allocationLegend}>
          {sectors.map((sector) => (
            <li key={sector.sector} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: sector.color }} />
              <span className={styles.legendLabel}>{sector.sector}</span>
              <span className={styles.legendValue}>{sector.displayPercentage}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Main PositionsPanel ──────────────────────────────────────────────────────

export function PositionsPanel() {
  const dispatch = useAppDispatch();
  const positions = useAppSelector((state) => state.portfolio.positions);
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const positionsHasMore = useAppSelector((state) => state.portfolio.positionsHasMore);
  const isLoadingMorePositions = useAppSelector((state) => state.portfolio.isLoadingMorePositions);
  const transactions = useAppSelector((state) => state.portfolio.transactions);
  const transactionsHasMore = useAppSelector((state) => state.portfolio.transactionsHasMore);
  const isLoadingTransactions = useAppSelector((state) => state.portfolio.isLoadingTransactions);
  const isLoadingMoreTransactions = useAppSelector(
    (state) => state.portfolio.isLoadingMoreTransactions
  );
  const isLoading = useAppSelector((state) => state.portfolio.isLoading);
  const error = useAppSelector((state) => state.portfolio.error);
  const equityHistory = useAppSelector((state) => state.portfolio.equityHistory);
  const investmentSummary = useAppSelector((state) => state.portfolio.investmentSummary);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('marketValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioPosition | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [buysRefreshKey, setBuysRefreshKey] = useState(0);
  const [closeTarget, setCloseTarget] = useState<PortfolioPosition | null>(null);

  useEffect(() => {
    void dispatch(fetchPortfolioSummaryThunk());
    void dispatch(fetchInvestmentSummaryThunk());
    void dispatch(fetchPositionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchTransactionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchPortfolioEquityHistoryThunk());
  }, [dispatch]);

  const computedSummaryPositions = useMemo(() => {
    return summaryPositions.map((position) => {
      const invested = position.shares * position.avgBuyPrice;
      const marketValue = position.shares * position.currentPrice;
      const pnlAbs = marketValue - invested;
      const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;
      return { ...position, invested, marketValue, pnlAbs, pnlPct };
    });
  }, [summaryPositions]);

  const computedTablePositions = useMemo(() => {
    return positions.map((position) => {
      const invested = position.shares * position.avgBuyPrice;
      const marketValue = position.shares * position.currentPrice;
      const pnlAbs = marketValue - invested;
      const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;
      return { ...position, invested, marketValue, pnlAbs, pnlPct };
    });
  }, [positions]);

  const costBasisOpen = useMemo(
    () => computedSummaryPositions.reduce((acc, position) => acc + position.invested, 0),
    [computedSummaryPositions]
  );

  const totalMarketValue = useMemo(
    () => computedSummaryPositions.reduce((acc, position) => acc + position.marketValue, 0),
    [computedSummaryPositions]
  );

  const totalInvested = useMemo(() => {
    const grossInvested = investmentSummary.totalInvested;
    return grossInvested > 0 ? grossInvested : costBasisOpen;
  }, [investmentSummary.totalInvested, costBasisOpen]);

  const totalWithdrawn = investmentSummary.totalWithdrawn;

  const unrealizedPnl = totalMarketValue - costBasisOpen;
  const totalPnl = totalMarketValue + totalWithdrawn - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const sectorAllocations = useMemo(
    () => buildSectorAllocations(computedSummaryPositions, totalMarketValue),
    [computedSummaryPositions, totalMarketValue]
  );

  function handleSortClick(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeletingId(deleteTarget.id);
    try {
      await dispatch(deletePositionThunk(deleteTarget.id)).unwrap();
      setDeleteTarget(null);
    } finally {
      setIsDeletingId(null);
    }
  }

  async function handleDeleteBuy(transactionId: string) {
    if (!deleteTarget) return;
    await dispatch(deleteBuyTransactionThunk(transactionId)).unwrap();
    setBuysRefreshKey((key) => key + 1);
  }

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = computedTablePositions.filter(
      (position) =>
        position.ticker.toLowerCase().includes(query) ||
        position.companyName.toLowerCase().includes(query)
    );
    return filtered.sort((positionA, positionB) => {
      const direction = sortDir === 'desc' ? -1 : 1;
      return (positionA[sortField] - positionB[sortField]) * direction;
    });
  }, [computedTablePositions, searchQuery, sortField, sortDir]);

  const isEmpty = summaryPositions.length === 0;

  function handleLoadMorePositions() {
    void dispatch(fetchPositionsPageThunk({ offset: positions.length, append: true }));
  }

  function handleLoadMoreTransactions() {
    void dispatch(fetchTransactionsPageThunk({ offset: transactions.length, append: true }));
  }

  function handleRetry() {
    void dispatch(fetchPortfolioSummaryThunk());
    void dispatch(fetchInvestmentSummaryThunk());
    void dispatch(fetchPositionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchTransactionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchPortfolioEquityHistoryThunk());
  }

  if (isLoading) {
    return (
      <>
        <div className={styles.loadingState}>
          <Loader size={24} className={styles.loadingSpinner} />
          <p>Loading portfolio…</p>
        </div>
        <AddPositionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
        <AddPositionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </>
    );
  }

  if (isEmpty) {
    return (
      <>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <TrendingUp size={28} />
          </div>
          <h3 className={styles.emptyTitle}>No positions yet</h3>
          <p className={styles.emptyText}>
            Add your first position manually or import a broker report to get started.
          </p>
          <div className={styles.emptyActions}>
            <Button
              variant="primary"
              leftIcon={<Plus size={14} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Position
            </Button>
          </div>
        </div>
        <AddPositionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </>
    );
  }

  return (
    <div className={styles.panel}>
      {/* ── Stats row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>TOTAL INVESTED</p>
          <p className={styles.statValue}>{formatUsd(totalInvested)}</p>
        </div>
        <div
          className={`${styles.statCard} ${totalPnl >= 0 ? styles.statCardPositive : styles.statCardNegative}`}
        >
          <p className={styles.statLabel}>TOTAL RETURN</p>
          <p className={`${styles.statValue} ${totalPnl >= 0 ? styles.positive : styles.negative}`}>
            {formatPnl(totalPnl)}
          </p>
        </div>
        <div
          className={`${styles.statCard} ${unrealizedPnl >= 0 ? styles.statCardPositive : styles.statCardNegative}`}
        >
          <p className={styles.statLabel}>UNREALIZED P&amp;L</p>
          <p
            className={`${styles.statValue} ${unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPnl(unrealizedPnl)}
          </p>
        </div>
        <div
          className={`${styles.statCard} ${totalReturnPct >= 0 ? styles.statCardPositive : styles.statCardNegative}`}
        >
          <p className={styles.statLabel}>TOTAL RETURN %</p>
          <p
            className={`${styles.statValue} ${totalReturnPct >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPercent(totalReturnPct)}
          </p>
        </div>
      </div>

      {/* ── Chart + Allocation row ── */}
      <div className={styles.chartsRow}>
        <MiniEquityChart
          equityHistory={equityHistory}
          totalPnl={totalPnl}
          totalInvested={totalInvested}
        />
        <DonutChart sectors={sectorAllocations} />
      </div>

      {/* ── Holdings table ── */}
      <div className={styles.holdingsSection}>
        <div className={styles.holdingsHeader}>
          <h3 className={styles.holdingsTitle}>Holdings</h3>
          <div className={styles.holdingsActions}>
            <div className={styles.searchWrapper}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={styles.searchInput}
              />
            </div>
            <Button variant="outline" size="sm" leftIcon={<ArrowUpDown size={12} />}>
              Sort
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={12} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Position
            </Button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
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
                  onClick={() => handleSortClick('marketValue')}
                >
                  MARKET VALUE ↕
                </th>
                <th
                  className={`${styles.thNum} ${styles.sortable} ${sortField === 'pnlAbs' ? styles.sortActive : ''}`}
                  onClick={() => handleSortClick('pnlAbs')}
                >
                  P&amp;L ↕
                </th>
                <th
                  className={`${styles.thNum} ${styles.sortable} ${sortField === 'pnlPct' ? styles.sortActive : ''}`}
                  onClick={() => handleSortClick('pnlPct')}
                >
                  % ↕
                </th>
                <th className={styles.thActions}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((position) => {
                const sectorLabel = position.sector ?? 'Other';
                const sectorIndex = sectorAllocations.findIndex((s) => s.sector === sectorLabel);
                const dotColor =
                  sectorIndex >= 0 ? SECTOR_COLORS[sectorIndex % SECTOR_COLORS.length] : '#8a8a96';
                const isPnlPositive = position.pnlAbs >= 0;

                return (
                  <tr key={position.id} className={styles.tableRow}>
                    <td className={styles.tdTicker}>
                      <span className={styles.tickerDot} style={{ background: dotColor }} />
                      <span className={styles.tickerSymbol}>{position.ticker}</span>
                    </td>
                    <td className={styles.tdName}>
                      <p className={styles.companyName}>{position.companyName}</p>
                      <p className={styles.sectorLabel}>{sectorLabel}</p>
                    </td>
                    <td className={styles.tdNum}>{position.shares}</td>
                    <td className={styles.tdNum}>{formatUsdDecimal(position.avgBuyPrice)}</td>
                    <td className={styles.tdNum}>{formatUsdDecimal(position.currentPrice)}</td>
                    <td className={styles.tdNum}>{formatUsd(position.marketValue)}</td>
                    <td
                      className={`${styles.tdNum} ${isPnlPositive ? styles.positive : styles.negative}`}
                    >
                      {formatPnl(position.pnlAbs)}
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
                        onClick={() =>
                          setCloseTarget(positions.find((p) => p.id === position.id) ?? null)
                        }
                      >
                        <HandCoins size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Delete position"
                        onClick={() =>
                          setDeleteTarget(positions.find((p) => p.id === position.id) ?? null)
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {positionsHasMore && (
          <div className={styles.loadMoreRow}>
            <Button
              variant="outline"
              size="sm"
              loading={isLoadingMorePositions}
              onClick={handleLoadMorePositions}
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      {/* ── Transaction history ── */}
      <div className={styles.holdingsSection}>
        <div className={styles.holdingsHeader}>
          <h3 className={styles.holdingsTitle}>History</h3>
        </div>

        {isLoadingTransactions ? (
          <div className={styles.inlineLoading}>
            <Loader size={18} className={styles.loadingSpinner} />
            <span>Loading history…</span>
          </div>
        ) : transactions.length === 0 ? (
          <p className={styles.emptyHistoryText}>No buy or sell transactions yet.</p>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thName}>DATE</th>
                    <th className={styles.thTicker}>TYPE</th>
                    <th className={styles.thTicker}>TICKER</th>
                    <th className={styles.thName}>NAME</th>
                    <th className={styles.thNum}>SHARES</th>
                    <th className={styles.thNum}>PRICE</th>
                    <th className={styles.thNum}>TOTAL</th>
                    <th className={styles.thNum}>CURRENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const totalAmount = transaction.shares * transaction.pricePerShare;
                    const isBuy = transaction.transactionType === 'BUY';

                    return (
                      <tr key={transaction.id} className={styles.tableRow}>
                        <td className={styles.historyTd}>{formatTransactionDate(transaction)}</td>
                        <td className={styles.historyTd}>
                          <span
                            className={`${styles.typeBadge} ${isBuy ? styles.typeBadgeBuy : styles.typeBadgeSell}`}
                          >
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className={styles.historyTd}>
                          <span className={styles.historyTicker}>{transaction.ticker}</span>
                        </td>
                        <td className={styles.historyTd}>{transaction.companyName}</td>
                        <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                          {transaction.shares}
                        </td>
                        <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                          {formatUsdDecimal(transaction.pricePerShare)}
                        </td>
                        <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                          {formatUsdDecimal(totalAmount)}
                        </td>
                        <td className={`${styles.historyTd} ${styles.historyTdNum}`}>
                          {transaction.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {transactionsHasMore && (
              <div className={styles.loadMoreRow}>
                <Button
                  variant="outline"
                  size="sm"
                  loading={isLoadingMoreTransactions}
                  onClick={handleLoadMoreTransactions}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AddPositionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        ticker={deleteTarget?.ticker ?? ''}
        onDeleteBuy={handleDeleteBuy}
        onDeleteAll={handleConfirmDelete}
        onSellInstead={() => {
          const pos = positions.find((p) => p.id === deleteTarget?.id) ?? null;
          setDeleteTarget(null);
          setCloseTarget(pos);
        }}
        onClose={() => setDeleteTarget(null)}
        isDeletingAll={isDeletingId !== null}
        buysRefreshKey={buysRefreshKey}
      />

      <ClosePositionModal
        isOpen={closeTarget !== null}
        position={closeTarget}
        onClose={() => setCloseTarget(null)}
      />
    </div>
  );
}
