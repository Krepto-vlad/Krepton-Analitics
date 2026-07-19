import { useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useDashboardLivePollingScopes } from '../../hooks/useLivePollingScope';
import {
  fetchPortfolioSummaryThunk,
  fetchPortfolioEquityHistoryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
} from '../../features/portfolio/portfolioSlice';
import {
  selectPortfolioStats,
  selectSectorAllocations,
} from '../../features/portfolio/portfolioSelectors';
import { PORTFOLIO_RISK_SCORE } from '../../constants';
import { ErrorBanner } from '../../components/ui';
import { PortfolioHealthCard } from './components/PortfolioHealthCard/PortfolioHealthCard';
import { PortfolioEquityCard } from './components/PortfolioEquityCard/PortfolioEquityCard';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import { WatchlistPanel } from './components/WatchlistPanel/WatchlistPanel';
import { NewsFeed } from './components/NewsFeed/NewsFeed';
import styles from './DashboardPage.module.scss';

export function DashboardPage() {
  useDashboardLivePollingScopes();

  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const stats = useAppSelector(selectPortfolioStats);
  const sectorAllocations = useAppSelector(selectSectorAllocations);
  const news = useAppSelector((state) => state.portfolio.news);
  const equityHistory = useAppSelector((state) => state.portfolio.equityHistory);
  const watchlist = useAppSelector((state) => state.watchlist.items);
  const portfolioError = useAppSelector((state) => state.portfolio.error);
  const watchlistError = useAppSelector((state) => state.watchlist.error);
  const currency = useAppSelector((state) => state.ui.currency);

  const dashboardError = useMemo(
    () => portfolioError ?? watchlistError,
    [portfolioError, watchlistError]
  );

  useEffect(() => {
    void dispatch(fetchPortfolioSummaryThunk());
    void dispatch(fetchInvestmentSummaryThunk());
    void dispatch(fetchPositionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchPortfolioEquityHistoryThunk());
  }, [dispatch]);

  return (
    <div className={styles.page}>
      {dashboardError && (
        <ErrorBanner message={dashboardError} className={styles.pageErrorBanner} />
      )}

      <div className={styles.topRow}>
        <PortfolioHealthCard score={PORTFOLIO_RISK_SCORE} sectors={sectorAllocations} />
        <PortfolioEquityCard stats={stats} equityHistory={equityHistory} currency={currency} />
      </div>

      <div className={styles.middleRow}>
        <PositionsTable positions={summaryPositions} currency={currency} />
        <WatchlistPanel watchlist={watchlist} currency={currency} />
      </div>

      <div className={styles.bottomRow}>
        <NewsFeed news={news} />
      </div>
    </div>
  );
}
