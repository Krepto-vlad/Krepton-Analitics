import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader, Moon, Star } from 'lucide-react';
import {
  DEFAULT_INTERVAL,
  DEFAULT_PERIOD,
  ERROR_MESSAGES,
  ROUTES,
  STOCK_PERIODS,
  TICKER_FORMAT_PATTERN,
  type Currency,
} from '../../constants';
import { fetchLiveFxRates } from '../../api/fxApi';
import { fetchTickerTransactions, type PortfolioTransaction } from '../../api/portfolioApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchPortfolioSummaryThunk } from '../../features/portfolio/portfolioSlice';
import {
  clearTickerError,
  fetchTickerFundamentalsThunk,
  fetchTickerHistoryThunk,
  fetchTickerNewsThunk,
  fetchTickerQuoteThunk,
} from '../../features/ticker/tickerSlice';
import {
  selectTickerFundamentals,
  selectTickerHistory,
  selectTickerNews,
  selectTickerQuote,
} from '../../features/ticker/tickerSelectors';
import {
  addWatchlistItemThunk,
  deleteWatchlistItemThunk,
  fetchWatchlistThunk,
} from '../../features/watchlist/watchlistSlice';
import { AsyncStatePanel, ErrorBanner, TickerAvatar } from '../../components/ui';
import { getRejectedMessage } from '../../utils/apiError';
import { buildTickerMarketSessionView } from '../../utils/marketSession';
import { formatMoney, formatSignedMoney, getTodayIsoDate } from '../../utils/moneyDisplay';
import { aggregateTickerHoldings } from '../../utils/tickerHoldings';
import { buildTradeChartMarkers } from '../../utils/tradeChartMarkers';
import type { OhlcvCandle } from '../../types/stock.types';
import {
  COMPARE_METRICS,
  type CompareDisplayContext,
  type CompareMetricKey,
  formatCompareMetricValue,
  getCompareMetricSecondaryValue,
} from '../ScreenerPage/utils/compareMatrix';
import { TickerNewsPanel } from './components/TickerNewsPanel';
import { TickerPriceChartPanel } from './components/TickerPriceChartPanel';
import styles from './TickerDetailPage.module.scss';

const TICKER_DETAIL_METRIC_KEYS: CompareMetricKey[] = [
  'sector',
  'marketCap',
  'peRatio',
  'forwardPeRatio',
  'pegRatio',
  'psRatio',
  'priceToBook',
  'roe',
  'profitMargin',
  'debtToEquity',
  'dividendYield',
  'beta',
];

const EMPTY_CANDLES: OhlcvCandle[] = [];
const EMPTY_TRANSACTIONS: PortfolioTransaction[] = [];

type StockPeriodValue = (typeof STOCK_PERIODS)[number]['value'];

function resolveTickerFromRouteParam(rawTicker: string): string {
  try {
    return decodeURIComponent(rawTicker).trim().toUpperCase();
  } catch {
    return '';
  }
}

function formatSignedChange(change: number, changePercent: number): string {
  const changePrefix = change >= 0 ? '+' : '';
  const percentPrefix = changePercent >= 0 ? '+' : '';
  return `${changePrefix}${change.toFixed(2)} (${percentPrefix}${changePercent.toFixed(2)}%)`;
}

export function TickerDetailPage() {
  const { ticker: rawTicker = '' } = useParams<{ ticker: string }>();
  const dispatch = useAppDispatch();
  const displayCurrency = useAppSelector((state) => state.ui.currency);

  const ticker = resolveTickerFromRouteParam(rawTicker);
  const isValidTicker = TICKER_FORMAT_PATTERN.test(ticker);

  const [selectedPeriod, setSelectedPeriod] = useState<StockPeriodValue>(
    DEFAULT_PERIOD as StockPeriodValue
  );
  const [fxRates, setFxRates] = useState<Record<Currency, number>>({ USD: 1, EUR: 1 });
  const [watchlistActionErrorState, setWatchlistActionErrorState] = useState<{
    ticker: string;
    message: string;
  } | null>(null);
  const [tickerTradesState, setTickerTradesState] = useState<{
    ticker: string;
    items: PortfolioTransaction[];
  }>({ ticker: '', items: [] });

  const watchlistActionError =
    watchlistActionErrorState?.ticker === ticker ? watchlistActionErrorState.message : null;
  const tickerTransactions = useMemo(
    () => (tickerTradesState.ticker === ticker ? tickerTradesState.items : EMPTY_TRANSACTIONS),
    [ticker, tickerTradesState]
  );

  const quote = useAppSelector((state) => selectTickerQuote(state, ticker));
  const history = useAppSelector((state) =>
    selectTickerHistory(state, ticker, selectedPeriod, DEFAULT_INTERVAL)
  );
  const fundamentals = useAppSelector((state) => selectTickerFundamentals(state, ticker));
  const news = useAppSelector((state) => selectTickerNews(state, ticker));
  const isLoadingQuote = useAppSelector((state) => state.ticker.isLoadingQuote);
  const isLoadingHistory = useAppSelector((state) => state.ticker.isLoadingHistory);
  const isLoadingFundamentals = useAppSelector((state) => state.ticker.isLoadingFundamentals);
  const isLoadingNews = useAppSelector((state) => state.ticker.isLoadingNews);
  const error = useAppSelector((state) => state.ticker.error);
  const newsError = useAppSelector((state) => state.ticker.newsError);

  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const hasHydratedSummary = useAppSelector((state) => state.portfolio.hasHydratedSummary);
  const isPortfolioLoading = useAppSelector((state) => state.portfolio.isLoading);

  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const hasHydratedWatchlist = useAppSelector((state) => state.watchlist.hasHydrated);
  const isWatchlistSubmitting = useAppSelector((state) => state.watchlist.isSubmitting);

  const candles = history?.candles ?? EMPTY_CANDLES;
  const chartCurrency = quote?.currency ?? fundamentals?.currency ?? 'USD';
  const sourceCurrency = (fundamentals?.currency ?? quote?.currency ?? 'USD') as Currency;

  const watchlistItem = useMemo(
    () => watchlistItems.find((item) => item.ticker.trim().toUpperCase() === ticker) ?? null,
    [ticker, watchlistItems]
  );
  const isOnWatchlist = watchlistItem != null;

  const holding = useMemo(
    () => aggregateTickerHoldings(summaryPositions, ticker),
    [summaryPositions, ticker]
  );

  const marketSession = useMemo(
    () => (quote ? buildTickerMarketSessionView(quote) : null),
    [quote]
  );

  const tradeMarkers = useMemo(
    () => buildTradeChartMarkers(tickerTransactions, candles),
    [candles, tickerTransactions]
  );

  useEffect(() => {
    if (!isValidTicker) {
      return;
    }

    dispatch(clearTickerError());
    void dispatch(fetchTickerQuoteThunk(ticker));
    void dispatch(fetchTickerFundamentalsThunk(ticker));
    void dispatch(fetchTickerNewsThunk(ticker));
  }, [dispatch, isValidTicker, ticker]);

  useEffect(() => {
    if (!isValidTicker) {
      return;
    }

    let cancelled = false;

    void fetchTickerTransactions(ticker)
      .then((transactions) => {
        if (!cancelled) {
          setTickerTradesState({ ticker, items: transactions });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTickerTradesState({ ticker, items: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isValidTicker, ticker]);

  useEffect(() => {
    if (!isValidTicker) {
      return;
    }

    void dispatch(
      fetchTickerHistoryThunk({
        ticker,
        period: selectedPeriod,
        interval: DEFAULT_INTERVAL,
      })
    );
  }, [dispatch, isValidTicker, selectedPeriod, ticker]);

  useEffect(() => {
    if (!hasHydratedSummary && !isPortfolioLoading) {
      void dispatch(fetchPortfolioSummaryThunk());
    }
  }, [dispatch, hasHydratedSummary, isPortfolioLoading]);

  useEffect(() => {
    if (!hasHydratedWatchlist) {
      void dispatch(fetchWatchlistThunk());
    }
  }, [dispatch, hasHydratedWatchlist]);

  useEffect(() => {
    let cancelled = false;

    void fetchLiveFxRates([sourceCurrency], displayCurrency, getTodayIsoDate())
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
  }, [displayCurrency, sourceCurrency]);

  const displayContext = useMemo<CompareDisplayContext>(
    () => ({
      displayCurrency,
      fxRates,
    }),
    [displayCurrency, fxRates]
  );

  const detailMetrics = useMemo(
    () =>
      COMPARE_METRICS.filter((metric) => TICKER_DETAIL_METRIC_KEYS.includes(metric.key)).filter(
        (metric) => {
          if (!fundamentals) {
            return false;
          }
          if (metric.key === 'sector') {
            return Boolean(fundamentals.sector || fundamentals.industry);
          }
          const value = fundamentals[metric.key];
          return value != null;
        }
      ),
    [fundamentals]
  );

  const companyName = quote?.name ?? fundamentals?.name ?? ticker;
  const priceCurrency = (quote?.currency ?? 'USD') as Currency;
  const isInitialLoading =
    isValidTicker &&
    !quote &&
    !fundamentals &&
    (isLoadingQuote || isLoadingFundamentals || isLoadingHistory);

  async function handleWatchlistToggle(): Promise<void> {
    setWatchlistActionErrorState(null);

    try {
      if (watchlistItem) {
        await dispatch(deleteWatchlistItemThunk(watchlistItem.id)).unwrap();
        return;
      }

      await dispatch(
        addWatchlistItemThunk({
          ticker,
          companyName,
        })
      ).unwrap();
    } catch (actionError) {
      setWatchlistActionErrorState({
        ticker,
        message: getRejectedMessage(
          actionError,
          isOnWatchlist
            ? ERROR_MESSAGES.WATCHLIST_DELETE_FAILED
            : ERROR_MESSAGES.WATCHLIST_ADD_FAILED
        ),
      });
    }
  }

  if (!isValidTicker) {
    return (
      <div className={styles.page}>
        <Link to={ROUTES.DASHBOARD} className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <ErrorBanner message={ERROR_MESSAGES.STOCK_INVALID_TICKER} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to={ROUTES.DASHBOARD} className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <button
          type="button"
          className={`${styles.watchlistButton} ${isOnWatchlist ? styles.watchlistButtonActive : ''}`}
          onClick={() => {
            void handleWatchlistToggle();
          }}
          disabled={isWatchlistSubmitting || !hasHydratedWatchlist}
          aria-label={isOnWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          title={isOnWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star size={18} fill={isOnWatchlist ? 'currentColor' : 'none'} />
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {watchlistActionError && <ErrorBanner message={watchlistActionError} />}

      {isInitialLoading ? (
        <AsyncStatePanel
          isLoading
          loadingMessage="Loading ticker details…"
          className={styles.loadingPanel}
        />
      ) : (
        <>
          <section className={styles.headerCard}>
            <div className={styles.identity}>
              <TickerAvatar ticker={ticker} logoUrl={quote?.logoUrl ?? null} size="md" />
              <div className={styles.identityText}>
                <h1 className={styles.tickerSymbol}>{ticker}</h1>
                <p className={styles.companyName}>{companyName}</p>
                <div className={styles.metaRow}>
                  {fundamentals?.sector && (
                    <span className={styles.metaChip}>{fundamentals.sector}</span>
                  )}
                  {fundamentals?.industry && (
                    <span className={styles.metaChip}>{fundamentals.industry}</span>
                  )}
                  {marketSession?.exchange && (
                    <span className={styles.metaChip}>{marketSession.exchange}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.priceBlock}>
              {quote && marketSession ? (
                <>
                  <div className={styles.priceHeader}>
                    <p className={styles.price}>
                      {formatMoney(marketSession.displayPrice, priceCurrency)}
                    </p>
                    <span
                      className={`${styles.sessionBadge} ${
                        marketSession.normalizedState === 'PRE' ||
                        marketSession.normalizedState === 'POST'
                          ? styles.sessionBadgeExtended
                          : ''
                      }`}
                    >
                      {(marketSession.normalizedState === 'PRE' ||
                        marketSession.normalizedState === 'CLOSED') && (
                        <Moon size={12} aria-hidden />
                      )}
                      {marketSession.sessionLabel}
                    </span>
                  </div>

                  {marketSession.lines.map((line) => {
                    const isPositive = line.changePercent >= 0;
                    return (
                      <p
                        key={line.label}
                        className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}
                      >
                        {formatSignedChange(line.change, line.changePercent)}
                        <span className={styles.changeLabel}>{line.label}</span>
                      </p>
                    );
                  })}
                </>
              ) : isLoadingQuote ? (
                <Loader size={20} />
              ) : (
                <p className={styles.companyName}>Quote unavailable</p>
              )}
            </div>
          </section>

          <section className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitleBlock}>
                <h2 className={styles.sectionTitle}>Price chart</h2>
                {tradeMarkers.length > 0 && (
                  <div className={styles.tradeLegend}>
                    <span className={styles.tradeLegendBuy}>Buy</span>
                    <span className={styles.tradeLegendSell}>Sell</span>
                  </div>
                )}
              </div>
              <div className={styles.periodSelector}>
                {STOCK_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    className={`${styles.periodButton} ${selectedPeriod === period.value ? styles.activePeriod : ''}`}
                    onClick={() => setSelectedPeriod(period.value)}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <TickerPriceChartPanel
              candles={candles}
              currency={chartCurrency}
              isLoading={isLoadingHistory}
              tradeMarkers={tradeMarkers}
              trades={tickerTransactions}
            />
          </section>

          {holding && (
            <section className={styles.holdingsCard}>
              <div className={styles.holdingsHeader}>
                <h2 className={styles.sectionTitle}>Your position</h2>
                <Link to={`${ROUTES.PORTFOLIO}?section=positions`} className={styles.holdingsLink}>
                  View portfolio
                </Link>
              </div>

              <div className={styles.holdingsRow}>
                <div className={styles.holdingsItem}>
                  <span className={styles.holdingsLabel}>Total value</span>
                  <span className={styles.holdingsValue}>
                    {formatMoney(holding.totalValue, holding.currency)}
                  </span>
                </div>
                <div className={styles.holdingsItem}>
                  <span className={styles.holdingsLabel}>P&amp;L</span>
                  <span
                    className={`${styles.holdingsValue} ${
                      holding.pnlPercent >= 0 ? styles.positive : styles.negative
                    }`}
                  >
                    {formatSignedMoney(holding.pnlAmount, holding.currency)}
                    <span className={styles.changeLabel}>
                      {holding.pnlPercent >= 0 ? '+' : ''}
                      {holding.pnlPercent.toFixed(2)}%
                    </span>
                  </span>
                </div>
                <div className={styles.holdingsItem}>
                  <span className={styles.holdingsLabel}>Shares</span>
                  <span className={styles.holdingsValue}>
                    {holding.shares.toLocaleString('en-US')}
                  </span>
                </div>
                <div className={styles.holdingsItem}>
                  <span className={styles.holdingsLabel}>Avg cost</span>
                  <span className={styles.holdingsValue}>
                    {formatMoney(holding.avgBuyPrice, holding.currency)}
                  </span>
                </div>
              </div>
            </section>
          )}

          <div className={styles.bottomRow}>
            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>Key statistics</h2>

              {isLoadingFundamentals && !fundamentals ? (
                <AsyncStatePanel
                  isLoading
                  loadingMessage="Loading fundamentals…"
                  className={styles.loadingPanel}
                />
              ) : detailMetrics.length === 0 &&
                !(quote?.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null) ? (
                <p className={styles.companyName}>Fundamentals are unavailable for this ticker.</p>
              ) : (
                <dl className={styles.statsList}>
                  {detailMetrics.map((metric) => {
                    if (!fundamentals) {
                      return null;
                    }

                    const secondaryValue = getCompareMetricSecondaryValue(metric.key, fundamentals);

                    return (
                      <div key={metric.key} className={styles.statsRow}>
                        <dt className={styles.statLabel}>
                          <span>{metric.label}</span>
                          {secondaryValue && (
                            <span className={styles.statSecondary}>{secondaryValue}</span>
                          )}
                        </dt>
                        <dd className={styles.statValue}>
                          {formatCompareMetricValue(metric.key, fundamentals, displayContext)}
                        </dd>
                      </div>
                    );
                  })}

                  {quote?.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
                    <div className={styles.statsRow}>
                      <dt className={styles.statLabel}>52-Week Range</dt>
                      <dd className={styles.statValue}>
                        {formatMoney(quote.fiftyTwoWeekLow, priceCurrency)} –{' '}
                        {formatMoney(quote.fiftyTwoWeekHigh, priceCurrency)}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              <p className={styles.disclaimer}>
                Market data from Yahoo Finance. Values may be delayed. Not financial advice.
              </p>
            </section>

            <TickerNewsPanel
              ticker={ticker}
              logoUrl={quote?.logoUrl ?? null}
              news={news}
              isLoading={isLoadingNews}
              error={newsError}
              onRetry={() => {
                void dispatch(fetchTickerNewsThunk(ticker));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
