import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, ExternalLink, Loader } from 'lucide-react';
import {
  ROUTES,
  DASHBOARD_NEWS_INITIAL_VISIBLE,
  DASHBOARD_NEWS_LOAD_MORE_STEP,
} from '../../../../constants';
import { ErrorBanner } from '../../../../components/ui';
import type { NewsItem } from '../../../../types/portfolio.types';
import styles from './NewsFeed.module.scss';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading?: boolean;
  error?: string | null;
  hasPortfolioHoldings?: boolean;
  onRetry?: () => void;
  layout?: 'compact' | 'full';
  showHeader?: boolean;
  initialVisibleCount?: number;
  loadMoreStep?: number;
}

export function NewsFeed({
  news,
  isLoading = false,
  error = null,
  hasPortfolioHoldings = false,
  onRetry,
  layout = 'compact',
  showHeader = true,
  initialVisibleCount = DASHBOARD_NEWS_INITIAL_VISIBLE,
  loadMoreStep = DASHBOARD_NEWS_LOAD_MORE_STEP,
}: NewsFeedProps) {
  const newsKey = useMemo(() => news.map((item) => item.id).join('|'), [news]);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [previousNewsKey, setPreviousNewsKey] = useState(newsKey);
  const [previousInitialVisibleCount, setPreviousInitialVisibleCount] =
    useState(initialVisibleCount);

  if (newsKey !== previousNewsKey || initialVisibleCount !== previousInitialVisibleCount) {
    setPreviousNewsKey(newsKey);
    setPreviousInitialVisibleCount(initialVisibleCount);
    setVisibleCount(initialVisibleCount);
  }

  const visibleNews = useMemo(() => news.slice(0, visibleCount), [news, visibleCount]);
  const hasMoreNews = news.length > visibleCount;
  const remainingCount = news.length - visibleCount;

  function handleLoadMore() {
    setVisibleCount((current) => Math.min(current + loadMoreStep, news.length));
  }

  const cardClassName =
    layout === 'full'
      ? `${styles.card} ${styles.cardFull}`
      : `${styles.card} ${styles.cardCompact}`;

  return (
    <div className={cardClassName}>
      {showHeader && (
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.cardLabel}>MARKET INTELLIGENCE</span>
            <span className={styles.cardTitle}>Contextual News Feed</span>
          </div>
          <span className={styles.filteredLabel}>
            <Newspaper size={12} />
            Filtered by portfolio
          </span>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <div className={styles.newsList}>
        {isLoading ? (
          <div className={styles.emptyState} aria-busy="true">
            <Loader size={22} className={styles.loadingSpinner} />
            <p className={styles.emptyText}>Loading news for your holdings…</p>
          </div>
        ) : !hasPortfolioHoldings ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No holdings yet</p>
            <p className={styles.emptyText}>
              Add positions to your portfolio and we&apos;ll surface relevant market news here.
            </p>
            <Link to={`${ROUTES.PORTFOLIO}?section=positions`} className={styles.emptyAction}>
              Add Position
            </Link>
          </div>
        ) : news.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No recent news</p>
            <p className={styles.emptyText}>
              We couldn&apos;t find recent headlines for your current holdings. Try again later.
            </p>
            {onRetry && (
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        ) : (
          visibleNews.map((item) => (
            <article key={item.id} className={styles.newsItem}>
              <div className={styles.tickerTags}>
                {item.tickers.map((ticker) => (
                  <span key={ticker} className={styles.tickerTag} title={ticker}>
                    ${ticker}
                  </span>
                ))}
              </div>
              <div className={styles.newsContent}>
                <div className={styles.newsMeta}>
                  <span className={styles.source}>{item.source}</span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.timeAgo}>{item.timeAgo}</span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.headlineLink}
                >
                  <span className={styles.headline}>{item.headline}</span>
                  <ExternalLink size={13} className={styles.externalIcon} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {hasMoreNews && (
        <div className={styles.loadMoreRow}>
          <button type="button" className={styles.loadMoreButton} onClick={handleLoadMore}>
            Load more ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
