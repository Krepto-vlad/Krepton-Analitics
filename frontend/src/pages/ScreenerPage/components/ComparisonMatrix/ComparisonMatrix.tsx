import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildTickerDetailPath, LOADING_MESSAGES, type Currency } from '../../../../constants';
import type { StockCompareItem } from '../../../../types/stock.types';
import { fetchLiveFxRates } from '../../../../api/fxApi';
import { AsyncStatePanel, TickerAvatar } from '../../../../components/ui';
import { getTodayIsoDate } from '../../../../utils/moneyDisplay';
import {
  type CompareDisplayContext,
  formatCompareMetricValue,
  getBestTickersForMetric,
  getCompareMetricSecondaryValue,
  getVisibleCompareMetrics,
} from '../../utils/compareMatrix';
import styles from './ComparisonMatrix.module.scss';

interface ComparisonMatrixProps {
  items: StockCompareItem[];
  isLoading: boolean;
  selectedCount: number;
  minTickers: number;
  displayCurrency: Currency;
}

export function ComparisonMatrix({
  items,
  isLoading,
  selectedCount,
  minTickers,
  displayCurrency,
}: ComparisonMatrixProps) {
  const [fxRates, setFxRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 1 });

  const sourceCurrencies = useMemo(
    () => [...new Set(items.map((item) => item.currency as Currency))],
    [items]
  );

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

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
  }, [displayCurrency, items.length, sourceCurrencies]);

  const displayContext = useMemo<CompareDisplayContext>(
    () => ({
      displayCurrency,
      fxRates,
    }),
    [displayCurrency, fxRates]
  );

  const visibleMetrics = useMemo(
    () => (items.length > 0 ? getVisibleCompareMetrics(items) : []),
    [items]
  );

  if (selectedCount < minTickers) {
    return (
      <section className={styles.card}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Add tickers to compare</p>
          <p className={styles.emptyText}>
            Select at least {minTickers} tickers using search or quick picks from your watchlist.
          </p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={styles.card}>
        <AsyncStatePanel
          isLoading
          loadingPreset="compare"
          loadingMessage={LOADING_MESSAGES.STOCK_COMPARE}
        />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No comparison data</p>
          <p className={styles.emptyText}>
            We couldn&apos;t load fundamentals for the selected tickers. Try again in a moment.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.metricHeader}>Metric</th>
              {items.map((item) => (
                <th key={item.ticker} className={styles.tickerHeader}>
                  <Link to={buildTickerDetailPath(item.ticker)} className={styles.tickerHeaderLink}>
                    <div className={styles.tickerHeaderContent}>
                      <TickerAvatar ticker={item.ticker} size="sm" />
                      <span className={styles.tickerSymbol}>${item.ticker}</span>
                      <span className={styles.tickerName}>{item.name}</span>
                    </div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMetrics.map((metric) => {
              const bestTickers = getBestTickersForMetric(metric.key, items, displayContext);

              return (
                <tr key={metric.key}>
                  <td className={styles.metricCell}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <span className={styles.metricSublabel}>{metric.sublabel}</span>
                  </td>
                  {items.map((item) => {
                    const isBest = bestTickers.has(item.ticker);
                    const secondaryValue = getCompareMetricSecondaryValue(metric.key, item);

                    return (
                      <td
                        key={`${metric.key}-${item.ticker}`}
                        className={`${styles.valueCell} ${isBest ? styles.bestCell : ''}`}
                      >
                        <div className={styles.valueContent}>
                          <span className={styles.valuePrimary}>
                            {formatCompareMetricValue(metric.key, item, displayContext)}
                          </span>
                          {secondaryValue && (
                            <span className={styles.valueSecondary}>{secondaryValue}</span>
                          )}
                          {isBest && <span className={styles.bestBadge}>BEST</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.legend}>
        <span className={styles.legendAccent}>*</span> Green highlight = superior metric among
        compared stocks. Monetary values are shown in {displayCurrency}. Data is sourced from Yahoo
        Finance and may be delayed.
      </p>
    </section>
  );
}
