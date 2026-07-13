import { useMemo, useState } from 'react';
import { Plus, Trash2, Search, Loader, Star } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import {
  fetchWatchlistThunk,
  deleteWatchlistItemThunk,
} from '../../../../features/watchlist/watchlistSlice';
import { AddTickerModal } from '../AddTickerModal/AddTickerModal';
import styles from './WatchlistPanel.module.scss';

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOptionalPrice(value: number | null, currency: string): string {
  if (value === null || value <= 0) return '—';
  return formatPrice(value, currency);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function WatchlistPanel() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.watchlist.items);
  const isLoading = useAppSelector((state) => state.watchlist.isLoading);
  const error = useAppSelector((state) => state.watchlist.error);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.ticker.toLowerCase().includes(query) || item.companyName.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    try {
      await dispatch(deleteWatchlistItemThunk(itemId)).unwrap();
    } finally {
      setDeletingId(null);
    }
  }

  function handleRetry() {
    void dispatch(fetchWatchlistThunk());
  }

  if (isLoading && items.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <Loader size={20} className={styles.loadingSpinner} />
          <span>Loading watchlist…</span>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Star size={16} />
          </div>
          <div>
            <h2 className={styles.title}>Watchlist</h2>
            <p className={styles.subtitle}>Monitor stocks you&apos;re interested in</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Ticker
        </Button>
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Star size={28} />
          </div>
          <h3 className={styles.emptyTitle}>Watchlist is empty</h3>
          <p className={styles.emptyText}>
            Add tickers you want to follow. You&apos;ll see live price updates here.
          </p>
          <Button
            variant="primary"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Ticker
          </Button>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.searchWrapper}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={styles.searchInput}
              />
            </div>
            <span className={styles.countLabel}>
              {filteredItems.length} ticker{filteredItems.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colTicker} />
                <col className={styles.colName} />
                <col className={styles.colPrice} />
                <col className={styles.colWeekHigh} />
                <col className={styles.colWeekLow} />
                <col className={styles.colChange} />
                <col className={styles.colAction} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.thTicker}>TICKER</th>
                  <th className={styles.thName}>NAME</th>
                  <th className={styles.thNum}>PRICE</th>
                  <th className={styles.thNum}>52W HIGH</th>
                  <th className={styles.thNum}>52W LOW</th>
                  <th className={styles.thNum}>CHANGE</th>
                  <th className={styles.thAction} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isPositive = item.changePercent >= 0;
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr key={item.id}>
                      <td className={styles.tdTicker}>
                        <div className={styles.tickerCell}>
                          <span className={styles.tickerBadge}>{item.ticker.slice(0, 2)}</span>
                          <span className={styles.tickerSymbol}>{item.ticker}</span>
                        </div>
                      </td>
                      <td className={styles.tdName}>{item.companyName}</td>
                      <td className={styles.tdNum}>{formatPrice(item.price, item.currency)}</td>
                      <td className={styles.tdNum}>
                        {formatOptionalPrice(item.fiftyTwoWeekHigh, item.currency)}
                      </td>
                      <td className={styles.tdNum}>
                        {formatOptionalPrice(item.fiftyTwoWeekLow, item.currency)}
                      </td>
                      <td className={styles.tdNum}>
                        <span className={isPositive ? styles.positive : styles.negative}>
                          {formatPercent(item.changePercent)}
                        </span>
                      </td>
                      <td className={styles.tdAction}>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          title="Remove from watchlist"
                          disabled={isDeleting}
                          onClick={() => void handleDelete(item.id)}
                        >
                          {isDeleting ? (
                            <Loader size={14} className={styles.actionSpinner} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <p className={styles.inlineError}>{error}</p>}
        </div>
      )}

      <AddTickerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
