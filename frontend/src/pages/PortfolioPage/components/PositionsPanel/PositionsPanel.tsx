import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { Button, AsyncStatePanel } from '../../../../components/ui';
import { buildLogoByTicker } from '../../../../utils/tickerLogos';
import { isIncludedInPortfolioAnalysis } from '../../../../utils/portfolioAnalysisScope';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import {
  PORTFOLIO_IMPORTER_PATH,
  HOLDINGS_TABLE_HEADER_HEIGHT_PX,
  HOLDINGS_TABLE_ROW_HEIGHT_PX,
  LOADING_MESSAGES,
} from '../../../../constants';
import {
  formatMoneyWhole,
  resolveInvestmentSummaryForDisplay,
} from '../../../../utils/moneyDisplay';
import type { PortfolioPosition } from '../../../../types/portfolio.types';
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
import { DonutChart } from './SectorDonutChart';
import { buildSectorAllocations } from './sectorAllocations';
import { HoldingsTable } from './HoldingsTable';
import { OutsideHoldingsTable } from './OutsideHoldingsTable';
import { TransactionHistory } from './TransactionHistory';
import { MiniEquityChart } from './MiniEquityChart';
import { formatPercent, formatPnl } from './positionsPanelFormat';

type HoldingsSortField = 'marketValue' | 'pnlAbs' | 'pnlPct';
type HoldingsSortDirection = 'asc' | 'desc';

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
  const displayCurrency = useAppSelector((state) => state.ui.currency);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<HoldingsSortField>('marketValue');
  const [sortDir, setSortDir] = useState<HoldingsSortDirection>('desc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioPosition | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [buysRefreshKey, setBuysRefreshKey] = useState(0);
  const [closeTarget, setCloseTarget] = useState<PortfolioPosition | null>(null);

  const logoByTicker = useMemo(
    () => buildLogoByTicker(summaryPositions, positions),
    [summaryPositions, positions]
  );

  const computedSummaryPositions = useMemo(() => {
    return summaryPositions.filter(isIncludedInPortfolioAnalysis).map((position) => {
      const invested = position.shares * position.avgBuyPrice;
      const marketValue = position.shares * position.currentPrice;
      const pnlAbs = marketValue - invested;
      const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;
      return { ...position, invested, marketValue, pnlAbs, pnlPct };
    });
  }, [summaryPositions]);

  const outsideSummaryPositions = useMemo(() => {
    return summaryPositions
      .filter((position) => !isIncludedInPortfolioAnalysis(position))
      .map((position) => ({
        ...position,
        marketValue: position.shares * position.currentPrice,
      }));
  }, [summaryPositions]);

  const computedTablePositions = useMemo(() => {
    return positions.filter(isIncludedInPortfolioAnalysis).map((position) => {
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

  const resolvedInvestmentSummary = useMemo(
    () => resolveInvestmentSummaryForDisplay(investmentSummary, displayCurrency),
    [investmentSummary, displayCurrency]
  );

  const totalInvested = useMemo(() => {
    return resolvedInvestmentSummary.totalInvested > 0
      ? resolvedInvestmentSummary.totalInvested
      : costBasisOpen;
  }, [resolvedInvestmentSummary.totalInvested, costBasisOpen]);

  const totalWithdrawn = resolvedInvestmentSummary.totalWithdrawn;

  const unrealizedPnl = totalMarketValue - costBasisOpen;
  const totalPnl = totalMarketValue + totalWithdrawn - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const sectorAllocations = useMemo(
    () => buildSectorAllocations(computedSummaryPositions, totalMarketValue),
    [computedSummaryPositions, totalMarketValue]
  );

  function handleSortClick(field: HoldingsSortField) {
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

  // Keep the table shell height while search filters rows, so History below doesn't jump.
  const holdingsTableMinHeightPx = useMemo(() => {
    const reservedRowCount = Math.max(computedTablePositions.length, 1);
    return HOLDINGS_TABLE_HEADER_HEIGHT_PX + reservedRowCount * HOLDINGS_TABLE_ROW_HEIGHT_PX;
  }, [computedTablePositions.length]);

  const hasActiveHoldingsSearch = searchQuery.trim().length > 0;
  const hasNoHoldingsSearchMatches =
    hasActiveHoldingsSearch && filteredAndSorted.length === 0 && computedTablePositions.length > 0;

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
        <AsyncStatePanel
          isLoading
          loadingPreset="table"
          loadingMessage={LOADING_MESSAGES.PORTFOLIO_HOLDINGS}
        />
        <AddPositionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <AsyncStatePanel
          error={error}
          errorTitle="Unable to load portfolio"
          onRetry={handleRetry}
        />
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
          <h2 className={styles.emptyTitle}>No positions yet</h2>
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
            <Link to={PORTFOLIO_IMPORTER_PATH} className={styles.emptyImportLink}>
              Import or connect a broker
            </Link>
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
          <p className={styles.statValue}>{formatMoneyWhole(totalInvested, displayCurrency)}</p>
        </div>
        <div
          className={`${styles.statCard} ${totalPnl >= 0 ? styles.statCardPositive : styles.statCardNegative}`}
        >
          <p className={styles.statLabel}>TOTAL RETURN</p>
          <p className={`${styles.statValue} ${totalPnl >= 0 ? styles.positive : styles.negative}`}>
            {formatPnl(totalPnl, displayCurrency)}
          </p>
        </div>
        <div
          className={`${styles.statCard} ${unrealizedPnl >= 0 ? styles.statCardPositive : styles.statCardNegative}`}
        >
          <p className={styles.statLabel}>UNREALIZED P&amp;L</p>
          <p
            className={`${styles.statValue} ${unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {formatPnl(unrealizedPnl, displayCurrency)}
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
          currency={displayCurrency}
        />
        <DonutChart sectors={sectorAllocations} />
      </div>

      <HoldingsTable
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onAddPosition={() => setIsAddModalOpen(true)}
        sortField={sortField}
        onSort={handleSortClick}
        hasNoHoldingsSearchMatches={hasNoHoldingsSearchMatches}
        rows={filteredAndSorted}
        showOutsideEmptyState={outsideSummaryPositions.length > 0}
        logoByTicker={logoByTicker}
        displayCurrency={displayCurrency}
        onClosePosition={(positionId) =>
          setCloseTarget(positions.find((position) => position.id === positionId) ?? null)
        }
        onDeletePosition={(positionId) =>
          setDeleteTarget(positions.find((position) => position.id === positionId) ?? null)
        }
        hasMore={positionsHasMore}
        isLoadingMore={isLoadingMorePositions}
        onLoadMore={handleLoadMorePositions}
        minHeightPx={holdingsTableMinHeightPx}
      />

      <OutsideHoldingsTable
        positions={outsideSummaryPositions}
        logoByTicker={logoByTicker}
        displayCurrency={displayCurrency}
      />

      <TransactionHistory
        isLoading={isLoadingTransactions}
        transactions={transactions}
        logoByTicker={logoByTicker}
        displayCurrency={displayCurrency}
        hasMore={transactionsHasMore}
        isLoadingMore={isLoadingMoreTransactions}
        onLoadMore={handleLoadMoreTransactions}
      />

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
