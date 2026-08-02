import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { ERROR_MESSAGES, MARKET_MOVERS_COUNT } from '../../../../constants';
import { fetchMarketMovers } from '../../../../api/stockApi';
import type { MarketMoverItem, MarketMoversResponse } from '../../../../types/stock.types';
import { getRejectedMessage } from '../../../../utils/apiError';
import type { SelectedCompareTicker } from '../../utils/compareMatrix';
import styles from './MarketMoversPanel.module.scss';

interface MarketMoversPanelProps {
  selectedTickers: SelectedCompareTicker[];
  canAddTickers: boolean;
  onAddTicker: (ticker: SelectedCompareTicker) => void;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFetchedAt(fetchedAt: string): string {
  const date = new Date(fetchedAt);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MoverRow({
  item,
  rank,
  isSelected,
  canAdd,
  onAdd,
}: {
  item: MarketMoverItem;
  rank: number;
  isSelected: boolean;
  canAdd: boolean;
  onAdd: () => void;
}) {
  const isPositive = item.changePercent >= 0;

  return (
    <li className={styles.row}>
      <span className={styles.rank}>{rank}</span>
      <div className={styles.tickerBlock}>
        <span className={styles.ticker}>${item.ticker}</span>
        <span className={styles.name} title={item.name}>
          {item.name}
        </span>
      </div>
      <div className={styles.priceBlock}>
        <span className={styles.price}>{formatPrice(item.price, item.currency)}</span>
        <span className={isPositive ? styles.changePositive : styles.changeNegative}>
          {formatSignedPercent(item.changePercent)}
        </span>
      </div>
      <button
        type="button"
        className={styles.addButton}
        onClick={onAdd}
        disabled={!canAdd || isSelected}
        title={isSelected ? 'Already in comparison' : 'Add to comparison'}
        aria-label={
          isSelected ? `${item.ticker} already in comparison` : `Add ${item.ticker} to comparison`
        }
      >
        <Plus size={14} />
      </button>
    </li>
  );
}

export function MarketMoversPanel({
  selectedTickers,
  canAddTickers,
  onAddTicker,
}: MarketMoversPanelProps) {
  const [movers, setMovers] = useState<MarketMoversResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTickerSet = new Set(selectedTickers.map((item) => item.ticker.toUpperCase()));

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialMovers() {
      try {
        const response = await fetchMarketMovers();
        if (isCancelled) {
          return;
        }

        setMovers(response);
        setError(null);
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setMovers(null);
        setError(getRejectedMessage(loadError, ERROR_MESSAGES.STOCK_MOVERS_FAILED));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialMovers();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleRefresh() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchMarketMovers();
      setMovers(response);
    } catch (loadError) {
      setMovers(null);
      setError(getRejectedMessage(loadError, ERROR_MESSAGES.STOCK_MOVERS_FAILED));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.titleRow}>
            <TrendingUp size={18} className={styles.titleIcon} />
            <h2 className={styles.title}>Market Movers</h2>
          </div>
          <p className={styles.subtitle}>
            Top {MARKET_MOVERS_COUNT} US gainers and losers today from Yahoo Finance. Click + to add
            a ticker to comparison.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void handleRefresh()}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 size={14} className={styles.spinner} /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {error && <p className={styles.errorState}>{error}</p>}

      {isLoading && !movers && <p className={styles.loadingState}>Loading market movers…</p>}

      {movers && (
        <>
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3 className={`${styles.columnTitle} ${styles.columnTitleGainers}`}>
                <TrendingUp size={14} />
                Top gainers
              </h3>
              {movers.gainers.length === 0 ? (
                <p className={styles.emptyState}>No gainers available right now.</p>
              ) : (
                <ol className={styles.list}>
                  {movers.gainers.map((item, index) => (
                    <MoverRow
                      key={item.ticker}
                      item={item}
                      rank={index + 1}
                      isSelected={selectedTickerSet.has(item.ticker)}
                      canAdd={canAddTickers}
                      onAdd={() => onAddTicker({ ticker: item.ticker, name: item.name })}
                    />
                  ))}
                </ol>
              )}
            </div>

            <div className={styles.column}>
              <h3 className={`${styles.columnTitle} ${styles.columnTitleLosers}`}>
                <TrendingDown size={14} />
                Top losers
              </h3>
              {movers.losers.length === 0 ? (
                <p className={styles.emptyState}>No losers available right now.</p>
              ) : (
                <ol className={styles.list}>
                  {movers.losers.map((item, index) => (
                    <MoverRow
                      key={item.ticker}
                      item={item}
                      rank={index + 1}
                      isSelected={selectedTickerSet.has(item.ticker)}
                      canAdd={canAddTickers}
                      onAdd={() => onAddTicker({ ticker: item.ticker, name: item.name })}
                    />
                  ))}
                </ol>
              )}
            </div>
          </div>

          <p className={styles.footer}>Updated {formatFetchedAt(movers.fetchedAt)} · US market</p>
        </>
      )}
    </section>
  );
}
