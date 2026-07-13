import { Radio } from 'lucide-react';
import type { WatchlistItem } from '../../../../types/watchlist.types';
import styles from './WatchlistPanel.module.scss';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  currency: string;
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function WatchlistPanel({ watchlist, currency }: WatchlistPanelProps) {
  const now = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardLabel}>REAL-TIME FEED</span>
          <span className={styles.cardTitle}>Watchlist</span>
        </div>
        <div className={styles.liveClock}>
          <Radio size={12} className={styles.liveIcon} />
          <span className={styles.clockText}>{now}</span>
        </div>
      </div>

      <div className={styles.divider} />

      {watchlist.length === 0 ? (
        <p className={styles.emptyText}>No tickers in your watchlist yet.</p>
      ) : (
        <>
          <div className={styles.headerRow}>
            <span className={styles.colTicker}>TICKER</span>
            <span className={styles.colPrice}>PRICE</span>
            <span className={styles.colChange}>CHANGE</span>
          </div>

          <div className={styles.list}>
            {watchlist.map((item) => {
              const isPositive = item.changePercent >= 0;
              const displayCurrency = currency || item.currency;

              return (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemTicker}>
                    <div className={styles.tickerAvatar}>{item.ticker.slice(0, 2)}</div>
                    <div className={styles.tickerInfo}>
                      <span className={styles.tickerSymbol}>{item.ticker}</span>
                      <span className={styles.companyName}>{item.companyName}</span>
                    </div>
                  </div>
                  <span className={styles.itemPrice}>
                    {formatPrice(item.price, displayCurrency)}
                  </span>
                  <span
                    className={`${styles.itemChange} ${isPositive ? styles.positive : styles.negative}`}
                  >
                    {isPositive ? '+' : ''}
                    {item.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
