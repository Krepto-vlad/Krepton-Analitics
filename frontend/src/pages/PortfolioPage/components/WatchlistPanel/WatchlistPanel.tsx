import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, Loader, Star } from 'lucide-react';
import { Button, AsyncStatePanel, ErrorBanner, TickerAvatar } from '../../../../components/ui';
import {
  buildTickerDetailPath,
  LOADING_MESSAGES,
  WATCHLIST_TABLE_HEADER_HEIGHT_PX,
  WATCHLIST_TABLE_ROW_HEIGHT_PX,
  type Currency,
} from '../../../../constants';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { fetchLiveFxRates } from '../../../../api/fxApi';
import { toCssCustomProperties } from '../../../../utils/cssCustomProperties';
import {
  convertAmountWithRate,
  formatMoney,
  getTodayIsoDate,
} from '../../../../utils/moneyDisplay';
import {
  fetchWatchlistThunk,
  deleteWatchlistItemThunk,
} from '../../../../features/watchlist/watchlistSlice';
import { AddTickerModal } from '../AddTickerModal/AddTickerModal';
import styles from './WatchlistPanel.module.scss';

function formatOptionalPrice(value: number | null, currency: Currency): string {
  if (value === null || value <= 0) return '—';
  return formatMoney(value, currency);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function WatchlistPanel() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.watchlist.items);
  const displayCurrency = useAppSelector((state) => state.ui.currency);
  const isLoading = useAppSelector((state) => state.watchlist.isLoading);
  const error = useAppSelector((state) => state.watchlist.error);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fxRates, setFxRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 1 });

  const sourceCurrencies = useMemo(
    () => [...new Set(items.map((item) => item.currency as Currency))],
    [items]
  );

  useEffect(() => {
    let cancelled = false;

    void fetchLiveFxRates(sourceCurrencies, displayCurrency, getTodayIsoDate())
      .then((rates) => {
        if (!cancelled) {
          setFxRates(rates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFxRates({ USD: 1, EUR: 1 });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayCurrency, sourceCurrencies]);

  function getDisplayPrice(price: number, sourceCurrency: string): number {
    const fromCurrency = sourceCurrency as Currency;
    const fxRate = fromCurrency === displayCurrency ? 1 : (fxRates[fromCurrency] ?? 1);
    return convertAmountWithRate(price, fxRate);
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.ticker.toLowerCase().includes(query) || item.companyName.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const watchlistTableMinHeightPx = useMemo(() => {
    const reservedRowCount = Math.max(items.length, 1);
    return WATCHLIST_TABLE_HEADER_HEIGHT_PX + reservedRowCount * WATCHLIST_TABLE_ROW_HEIGHT_PX;
  }, [items.length]);

  const hasActiveWatchlistSearch = searchQuery.trim().length > 0;
  const hasNoWatchlistSearchMatches =
    hasActiveWatchlistSearch && filteredItems.length === 0 && items.length > 0;

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
        <AsyncStatePanel
          isLoading
          loadingPreset="list"
          loadingMessage={LOADING_MESSAGES.WATCHLIST}
        />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className={styles.panel}>
        <AsyncStatePanel
          error={error}
          errorTitle="Unable to load watchlist"
          onRetry={handleRetry}
        />
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

          <div
            className={styles.tableWrapper}
            style={toCssCustomProperties({
              '--table-min-height': `${watchlistTableMinHeightPx}px`,
            })}
          >
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
                {hasNoWatchlistSearchMatches ? (
                  <tr className={styles.filterEmptyRow}>
                    <td colSpan={7}>
                      <div className={styles.filterEmptyState}>
                        <p className={styles.filterEmptyTitle}>No matching tickers</p>
                        <p className={styles.filterEmptyText}>
                          Nothing matches “{searchQuery.trim()}”. Try another ticker or company
                          name.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isPositive = item.changePercent >= 0;
                    const isDeleting = deletingId === item.id;

                    return (
                      <tr key={item.id}>
                        <td className={styles.tdTicker}>
                          <Link
                            to={buildTickerDetailPath(item.ticker)}
                            className={styles.tickerLink}
                          >
                            <div className={styles.tickerCell}>
                              <TickerAvatar ticker={item.ticker} logoUrl={item.logoUrl} size="sm" />
                              <span className={styles.tickerSymbol}>{item.ticker}</span>
                            </div>
                          </Link>
                        </td>
                        <td className={styles.tdName}>{item.companyName}</td>
                        <td className={styles.tdNum}>
                          {formatMoney(getDisplayPrice(item.price, item.currency), displayCurrency)}
                        </td>
                        <td className={styles.tdNum}>
                          {formatOptionalPrice(
                            item.fiftyTwoWeekHigh !== null
                              ? getDisplayPrice(item.fiftyTwoWeekHigh, item.currency)
                              : null,
                            displayCurrency
                          )}
                        </td>
                        <td className={styles.tdNum}>
                          {formatOptionalPrice(
                            item.fiftyTwoWeekLow !== null
                              ? getDisplayPrice(item.fiftyTwoWeekLow, item.currency)
                              : null,
                            displayCurrency
                          )}
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
                  })
                )}
              </tbody>
            </table>
          </div>

          {error && <ErrorBanner message={error} className={styles.inlineError} />}
        </div>
      )}

      <AddTickerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
