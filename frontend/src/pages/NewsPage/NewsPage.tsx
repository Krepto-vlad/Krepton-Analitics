import { useEffect, useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import { NEWS_PAGE_INITIAL_VISIBLE, NEWS_PAGE_LOAD_MORE_STEP } from '../../constants';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchPortfolioNewsThunk } from '../../features/portfolio/portfolioSlice';
import { NewsFeed } from '../DashboardPage/components/NewsFeed/NewsFeed';
import styles from './NewsPage.module.scss';

export function NewsPage() {
  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
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
          Headlines and market context filtered by your current holdings
        </p>
      </header>

      <NewsFeed
        news={news}
        isLoading={isLoadingNews}
        error={newsError}
        hasPortfolioHoldings={summaryPositions.length > 0}
        onRetry={handleRetryNews}
        layout="full"
        showHeader={false}
        initialVisibleCount={NEWS_PAGE_INITIAL_VISIBLE}
        loadMoreStep={NEWS_PAGE_LOAD_MORE_STEP}
      />
    </div>
  );
}
