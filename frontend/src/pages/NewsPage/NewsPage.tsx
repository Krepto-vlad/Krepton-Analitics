import { useEffect, useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import { NEWS_PAGE_INITIAL_VISIBLE, NEWS_PAGE_LOAD_MORE_STEP } from '../../constants';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  fetchPortfolioNewsThunk,
  fetchPortfolioSummaryThunk,
} from '../../features/portfolio/portfolioSlice';
import { buildLogoByTicker } from '../../utils/tickerLogos';
import { NewsFeed } from '../DashboardPage/components/NewsFeed/NewsFeed';
import { NewsSummaryPanel } from './components/NewsSummaryPanel/NewsSummaryPanel';
import styles from './NewsPage.module.scss';

export function NewsPage() {
  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const hasHydratedSummary = useAppSelector((state) => state.portfolio.hasHydratedSummary);
  const hasHydratedNews = useAppSelector((state) => state.portfolio.hasHydratedNews);
  const news = useAppSelector((state) => state.portfolio.news);
  const isLoadingNews = useAppSelector((state) => state.portfolio.isLoadingNews);
  const newsError = useAppSelector((state) => state.portfolio.newsError);

  const holdingsTickerKey = useMemo(
    () =>
      summaryPositions
        .map((position) => position.ticker)
        .sort()
        .join(','),
    [summaryPositions]
  );

  const newsLogoByTicker = useMemo(() => buildLogoByTicker(summaryPositions), [summaryPositions]);
  const hasPortfolioHoldings = summaryPositions.length > 0;
  const isHoldingsLoading = !hasHydratedSummary;
  const isNewsFeedLoading =
    isHoldingsLoading || isLoadingNews || (hasPortfolioHoldings && !hasHydratedNews);

  useEffect(() => {
    if (hasHydratedSummary) {
      return;
    }

    void dispatch(fetchPortfolioSummaryThunk());
  }, [dispatch, hasHydratedSummary]);

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
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Newspaper size={22} className={styles.titleIcon} />
          <h1 className={styles.title}>Portfolio News</h1>
        </div>
        <p className={styles.subtitle}>
          Headlines and AI-powered daily summaries for your holdings
        </p>
      </header>

      <NewsSummaryPanel
        key={holdingsTickerKey}
        holdings={summaryPositions}
        holdingsKey={holdingsTickerKey}
        isHoldingsLoading={isHoldingsLoading}
      />

      <NewsFeed
        news={news}
        isLoading={isNewsFeedLoading}
        error={newsError}
        hasPortfolioHoldings={hasPortfolioHoldings}
        onRetry={handleRetryNews}
        layout="full"
        showHeader={false}
        initialVisibleCount={NEWS_PAGE_INITIAL_VISIBLE}
        loadMoreStep={NEWS_PAGE_LOAD_MORE_STEP}
        logoByTicker={newsLogoByTicker}
      />
    </div>
  );
}
