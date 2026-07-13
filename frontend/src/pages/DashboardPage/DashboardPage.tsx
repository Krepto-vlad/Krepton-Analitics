import { useEffect } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useDashboardLivePollingScopes } from '../../hooks/useLivePollingScope';
import { fetchPortfolioEquityHistoryThunk } from '../../features/portfolio/portfolioSlice';
import { PORTFOLIO_RISK_SCORE } from '../../constants';
import { PortfolioHealthCard } from './components/PortfolioHealthCard/PortfolioHealthCard';
import { PortfolioEquityCard } from './components/PortfolioEquityCard/PortfolioEquityCard';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import { WatchlistPanel } from './components/WatchlistPanel/WatchlistPanel';
import { NewsFeed } from './components/NewsFeed/NewsFeed';
import styles from './DashboardPage.module.scss';

export function DashboardPage() {
  useDashboardLivePollingScopes();

  const dispatch = useAppDispatch();
  const { positions, stats, sectorAllocations, news, equityHistory } = useAppSelector(
    (state) => state.portfolio
  );
  const watchlist = useAppSelector((state) => state.watchlist.items);
  const currency = useAppSelector((state) => state.ui.currency);

  useEffect(() => {
    void dispatch(fetchPortfolioEquityHistoryThunk());
  }, [dispatch]);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <PortfolioHealthCard score={PORTFOLIO_RISK_SCORE} sectors={sectorAllocations} />
        <PortfolioEquityCard stats={stats} equityHistory={equityHistory} currency={currency} />
      </div>

      <div className={styles.middleRow}>
        <PositionsTable positions={positions} currency={currency} />
        <WatchlistPanel watchlist={watchlist} currency={currency} />
      </div>

      <div className={styles.bottomRow}>
        <NewsFeed news={news} />
      </div>
    </div>
  );
}
