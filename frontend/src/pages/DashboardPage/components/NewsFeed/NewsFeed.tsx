import { Newspaper } from 'lucide-react';
import type { NewsItem } from '../../../../types/portfolio.types';
import styles from './NewsFeed.module.scss';

interface NewsFeedProps {
  news: NewsItem[];
}

export function NewsFeed({ news }: NewsFeedProps) {
  return (
    <div className={styles.card}>
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

      <div className={styles.newsList}>
        {news.map((item) => (
          <div key={item.id} className={styles.newsItem}>
            <div className={styles.tickerTags}>
              {item.tickers.map((ticker) => (
                <span key={ticker} className={styles.tickerTag}>
                  ${ticker}
                </span>
              ))}
            </div>
            <div className={styles.newsMeta}>
              <span className={styles.source}>{item.source}</span>
              <span className={styles.dot}>·</span>
              <span className={styles.timeAgo}>{item.timeAgo}</span>
            </div>
            <p className={styles.headline}>{item.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
