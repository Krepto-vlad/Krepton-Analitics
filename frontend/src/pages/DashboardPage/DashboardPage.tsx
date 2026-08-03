import { useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useDashboardLivePollingScopes } from '../../hooks/useLivePollingScope';
import {
  fetchPortfolioNewsThunk,
  fetchPortfolioRebalancingThunk,
} from '../../features/portfolio/portfolioSlice';
import { selectPortfolioStats } from '../../features/portfolio/portfolioSelectors';
import { buildLogoByTicker } from '../../utils/tickerLogos';
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
  const isPortfolioLoading = useAppSelector((state) => state.portfolio.isLoading);
  const stats = useAppSelector(selectPortfolioStats);
  const portfolioHealth = useAppSelector((state) => state.portfolio.portfolioHealth);
  const news = useAppSelector((state) => state.portfolio.news);
  const isLoadingNews = useAppSelector((state) => state.portfolio.isLoadingNews);
  const newsError = useAppSelector((state) => state.portfolio.newsError);
  const equityHistory = useAppSelector((state) => state.portfolio.equityHistory);
  const watchlist = useAppSelector((state) => state.watchlist.items);
  const isWatchlistLoading = useAppSelector((state) => state.watchlist.isLoading);
  const portfolioError = useAppSelector((state) => state.portfolio.error);
  const watchlistError = useAppSelector((state) => state.watchlist.error);
  const currency = useAppSelector((state) => state.ui.currency);

  const dashboardError = useMemo(
    () => portfolioError ?? watchlistError,
    [portfolioError, watchlistError]
  );

  const holdingsTickerKey = useMemo(
    () =>
      summaryPositions
        .map((position) => position.ticker)
        .sort()
        .join(','),
    [summaryPositions]
  );

  const newsLogoByTicker = useMemo(
    () => buildLogoByTicker(summaryPositions, watchlist),
    [summaryPositions, watchlist]
  );

  useEffect(() => {
    void dispatch(fetchPortfolioRebalancingThunk());
  }, [dispatch, currency, holdingsTickerKey]);

  useEffect(() => {
    if (holdingsTickerKey.length === 0) {
      return;
    }

    void dispatch(fetchPortfolioNewsThunk());
  }, [dispatch, holdingsTickerKey]);

  function handleRetryNews() {
    void dispatch(fetchPortfolioNewsThunk());
  }

  return (
    <div className={styles.page}>
      {dashboardError && (
        <ErrorBanner message={dashboardError} className={styles.pageErrorBanner} />
      )}

      <div className={styles.topRow}>
        <PortfolioHealthCard
          alignmentScore={portfolioHealth.alignmentScore}
          strategyName={portfolioHealth.strategyName}
          deviations={portfolioHealth.deviations}
          isLoading={portfolioHealth.isLoading}
        />
        <PortfolioEquityCard
          stats={stats}
          equityHistory={equityHistory}
          currency={currency}
          isLoading={isPortfolioLoading}
        />
      </div>

      <div className={styles.middleRow}>
        <PositionsTable
          positions={summaryPositions}
          currency={currency}
          isLoading={isPortfolioLoading}
        />
        <WatchlistPanel watchlist={watchlist} currency={currency} isLoading={isWatchlistLoading} />
      </div>

      <div className={styles.bottomRow}>
        <NewsFeed
          news={news}
          isLoading={isLoadingNews}
          error={newsError}
          hasPortfolioHoldings={summaryPositions.length > 0}
          onRetry={handleRetryNews}
          logoByTicker={newsLogoByTicker}
        />
      </div>
    </div>
  );
}
