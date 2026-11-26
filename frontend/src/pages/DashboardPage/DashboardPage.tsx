import { useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useDashboardLivePollingScopes } from '../../hooks/useLivePollingScope';
import {
  fetchPortfolioNewsThunk,
  fetchPortfolioRebalancingThunk,
} from '../../features/portfolio/portfolioSlice';
import {
  selectIsDashboardBootstrapping,
  selectPortfolioStats,
} from '../../features/portfolio/portfolioSelectors';
import { buildLogoByTicker } from '../../utils/tickerLogos';
import { isIncludedInPortfolioAnalysis } from '../../utils/portfolioAnalysisScope';
import { ErrorBanner } from '../../components/ui';
import { toCssCustomProperties } from '../../utils/cssCustomProperties';
import {
  BEGINNER_TUTORIAL_ANCHORS,
  DASHBOARD_CARD_LINKS,
  DASHBOARD_PANEL_HEIGHT_PX,
} from '../../constants';
import { savePortfolioChatScreen } from '../../utils/tickerChatSession';
import { PortfolioHealthCard } from '../../components/PortfolioHealthCard/PortfolioHealthCard';
import { MarketIndicesRow } from './components/MarketIndicesRow/MarketIndicesRow';
import { PortfolioEquityCard } from './components/PortfolioEquityCard/PortfolioEquityCard';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import { WatchlistPanel } from './components/WatchlistPanel/WatchlistPanel';
import { NewsFeed } from './components/NewsFeed/NewsFeed';
import styles from './DashboardPage.module.scss';

export function DashboardPage() {
  useDashboardLivePollingScopes();

  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const isDashboardBootstrapping = useAppSelector(selectIsDashboardBootstrapping);
  const stats = useAppSelector(selectPortfolioStats);
  const portfolioHealth = useAppSelector((state) => state.portfolio.portfolioHealth);
  const news = useAppSelector((state) => state.portfolio.news);
  const newsError = useAppSelector((state) => state.portfolio.newsError);
  const equityHistory = useAppSelector((state) => state.portfolio.equityHistory);
  const watchlist = useAppSelector((state) => state.watchlist.items);
  const portfolioError = useAppSelector((state) => state.portfolio.error);
  const watchlistError = useAppSelector((state) => state.watchlist.error);
  const currency = useAppSelector((state) => state.ui.currency);

  const dashboardError = useMemo(
    () => portfolioError ?? watchlistError,
    [portfolioError, watchlistError]
  );

  const analyzedPositions = useMemo(
    () => summaryPositions.filter(isIncludedInPortfolioAnalysis),
    [summaryPositions]
  );

  const holdingsTickerKey = useMemo(
    () =>
      analyzedPositions
        .map((position) => position.ticker)
        .sort()
        .join(','),
    [analyzedPositions]
  );

  const newsLogoByTicker = useMemo(
    () => buildLogoByTicker(summaryPositions, watchlist),
    [summaryPositions, watchlist]
  );

  const hasPortfolioHoldings = analyzedPositions.length > 0;

  useEffect(() => {
    void dispatch(fetchPortfolioRebalancingThunk());
  }, [dispatch, currency, holdingsTickerKey]);

  useEffect(() => {
    if (holdingsTickerKey.length === 0) {
      return;
    }

    void dispatch(fetchPortfolioNewsThunk());
  }, [dispatch, holdingsTickerKey]);

  useEffect(() => {
    if (isDashboardBootstrapping) {
      return;
    }

    savePortfolioChatScreen(currency);
  }, [currency, isDashboardBootstrapping]);

  function handleRetryNews() {
    void dispatch(fetchPortfolioNewsThunk());
  }

  return (
    <div
      className={styles.page}
      style={toCssCustomProperties({
        '--dashboard-panel-height': `${DASHBOARD_PANEL_HEIGHT_PX}px`,
      })}
    >
      {dashboardError && (
        <ErrorBanner message={dashboardError} className={styles.pageErrorBanner} />
      )}

      <div className={styles.layout} data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.dashboard}>
        <div className={styles.marketIndices}>
          <MarketIndicesRow />
        </div>

        <div
          className={styles.topRow}
          data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.dashboardCard}
        >
          <PortfolioHealthCard
            alignmentScore={portfolioHealth.alignmentScore}
            strategyId={portfolioHealth.strategyId}
            strategyName={portfolioHealth.strategyName}
            deviations={portfolioHealth.deviations}
            navigation={DASHBOARD_CARD_LINKS.health}
            isLoading={isDashboardBootstrapping}
          />
          <PortfolioEquityCard
            stats={stats}
            equityHistory={equityHistory}
            currency={currency}
            isLoading={isDashboardBootstrapping}
          />
        </div>

        <div className={styles.middleRow}>
          <PositionsTable
            positions={analyzedPositions}
            currency={currency}
            isLoading={isDashboardBootstrapping}
          />
          <WatchlistPanel
            watchlist={watchlist}
            currency={currency}
            isLoading={isDashboardBootstrapping}
          />
        </div>

        <div className={styles.bottomRow}>
          <NewsFeed
            news={news}
            isLoading={isDashboardBootstrapping}
            error={newsError}
            hasPortfolioHoldings={hasPortfolioHoldings}
            onRetry={handleRetryNews}
            logoByTicker={newsLogoByTicker}
          />
        </div>
      </div>
    </div>
  );
}
