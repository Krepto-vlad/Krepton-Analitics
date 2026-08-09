import { useMemo, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import { TICKER_NEWS_INITIAL_VISIBLE, TICKER_NEWS_LOAD_MORE_STEP } from '../../../constants';
import { AsyncStatePanel, ErrorBanner, TickerAvatar } from '../../../components/ui';
import type { NewsItem } from '../../../types/portfolio.types';
import styles from '../TickerDetailPage.module.scss';

interface TickerNewsPanelProps {
  ticker: string;
  logoUrl: string | null;
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function TickerNewsPanelContent({
  ticker,
  logoUrl,
  news,
  isLoading,
  error,
  onRetry,
}: TickerNewsPanelProps) {
  const [visibleCount, setVisibleCount] = useState(TICKER_NEWS_INITIAL_VISIBLE);

  const visibleNews = news.slice(0, visibleCount);
  const remainingCount = Math.max(news.length - visibleCount, 0);

  return (
    <section className={styles.sideCard}>
      <div className={styles.sideCardHeader}>
        <h2 className={styles.sectionTitle}>News</h2>
        <span className={styles.sideCardBadge}>
          <Newspaper size={12} />
          {ticker}
        </span>
      </div>

      {error && <ErrorBanner message={error} />}

      {isLoading && news.length === 0 ? (
        <AsyncStatePanel isLoading loadingMessage="Loading news…" className={styles.loadingPanel} />
      ) : news.length === 0 ? (
        <div className={styles.newsEmpty}>
          <p className={styles.companyName}>No recent news for this ticker.</p>
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className={styles.newsList}>
            {visibleNews.map((item) => (
              <article key={item.id} className={styles.newsItem}>
                <div className={styles.newsMeta}>
                  <TickerAvatar ticker={ticker} logoUrl={logoUrl} size="xs" />
                  <span className={styles.newsSource}>{item.source}</span>
                  <span className={styles.newsDot}>·</span>
                  <span className={styles.newsTime}>{item.timeAgo}</span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.newsHeadline}
                >
                  <span>{item.headline}</span>
                  <ExternalLink size={14} />
                </a>
              </article>
            ))}
          </div>

          {remainingCount > 0 && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={() => {
                setVisibleCount((current) => current + TICKER_NEWS_LOAD_MORE_STEP);
              }}
            >
              Load more ({remainingCount})
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function TickerNewsPanel(props: TickerNewsPanelProps) {
  const newsKey = useMemo(() => props.news.map((item) => item.id).join('|'), [props.news]);

  return <TickerNewsPanelContent key={newsKey} {...props} />;
}
