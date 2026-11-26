import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Radio, Star } from 'lucide-react';
import type { Currency } from '../../../../constants';
import {
  buildTickerDetailPath,
  DASHBOARD_CARD_LINKS,
  DASHBOARD_ROW_NAVIGATION_ATTRIBUTE,
  LOADING_MESSAGES,
  PORTFOLIO_WATCHLIST_PATH,
} from '../../../../constants';
import type { WatchlistItem } from '../../../../types/watchlist.types';
import { fetchLiveFxRates } from '../../../../api/fxApi';
import {
  convertAmountWithRate,
  formatMoney,
  getTodayIsoDate,
} from '../../../../utils/moneyDisplay';
import { useCardNavigation } from '../../../../hooks/useCardNavigation';
import { TickerAvatar } from '../../../../components/ui';
import { CardCornerLink } from '../../../../components/CardCornerLink/CardCornerLink';
import { PanelEmptyState } from '../../../../components/PanelEmptyState/PanelEmptyState';
import styles from './WatchlistPanel.module.scss';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  currency: Currency;
  isLoading?: boolean;
}

export function WatchlistPanel({ watchlist, currency, isLoading = false }: WatchlistPanelProps) {
  const [fxRates, setFxRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 1 });

  const sourceCurrencies = useMemo(
    () => [...new Set(watchlist.map((item) => item.currency as Currency))],
    [watchlist]
  );

  useEffect(() => {
    let cancelled = false;

    void fetchLiveFxRates(sourceCurrencies, currency, getTodayIsoDate())
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
  }, [currency, sourceCurrencies]);

  const now = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  function getDisplayPrice(item: WatchlistItem): number {
    const sourceCurrency = item.currency as Currency;
    const fxRate = sourceCurrency === currency ? 1 : (fxRates[sourceCurrency] ?? 1);
    return convertAmountWithRate(item.price, fxRate);
  }

  const isEmpty = !isLoading && watchlist.length === 0;
  const isNavigable = !isLoading && !isEmpty;
  const handleCardClick = useCardNavigation(isNavigable ? DASHBOARD_CARD_LINKS.watchlist.to : null);

  return (
    <div
      className={`${styles.card} ${isNavigable ? styles.cardClickable : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.cardLabel}>REAL-TIME FEED</span>
          <span className={styles.cardTitle}>Watchlist</span>
        </div>
        <div className={styles.headerActions}>
          <div
            className={styles.liveClock}
            data-ready={!isLoading && !isEmpty ? 'true' : 'false'}
            aria-hidden={isLoading || isEmpty}
          >
            <Radio size={12} className={styles.liveIcon} />
            <span className={styles.clockText}>{now}</span>
          </div>
        </div>
      </div>

      {isLoading || isEmpty ? (
        <PanelEmptyState
          isLoading={isLoading}
          loadingPreset="list"
          loadingMessage={LOADING_MESSAGES.WATCHLIST}
          icon={<Star size={24} />}
          title="Watchlist is empty"
          description="You haven't added any tickers yet. Follow stocks you're interested in and see live price updates here."
          actionLabel="Add Ticker"
          actionTo={PORTFOLIO_WATCHLIST_PATH}
        />
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

              return (
                <div
                  key={item.id}
                  className={styles.item}
                  {...{ [DASHBOARD_ROW_NAVIGATION_ATTRIBUTE]: buildTickerDetailPath(item.ticker) }}
                >
                  <Link to={buildTickerDetailPath(item.ticker)} className={styles.itemTickerLink}>
                    <div className={styles.itemTicker}>
                      <TickerAvatar ticker={item.ticker} logoUrl={item.logoUrl} />
                      <div className={styles.tickerInfo}>
                        <span className={styles.tickerSymbol}>{item.ticker}</span>
                        <span className={styles.companyName}>{item.companyName}</span>
                      </div>
                    </div>
                  </Link>
                  <span className={styles.itemPrice}>
                    {formatMoney(getDisplayPrice(item), currency)}
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

      {isNavigable ? (
        <CardCornerLink
          to={DASHBOARD_CARD_LINKS.watchlist.to}
          label={DASHBOARD_CARD_LINKS.watchlist.label}
        />
      ) : null}
    </div>
  );
}
