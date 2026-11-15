import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Moon, Star, Sun } from 'lucide-react';
import {
  DEFAULT_INTERVAL,
  DEFAULT_PERIOD,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  ROUTES,
  STOCK_PERIODS,
  TICKER_CHAT_SCREEN_TICKER_KIND,
  TICKER_FORMAT_PATTERN,
  type Currency,
} from '../../constants';
import { fetchLiveFxRates } from '../../api/fxApi';
import { fetchTickerTransactions, type PortfolioTransaction } from '../../api/portfolioApi';
import {
  loadChatScreenContext,
  saveActiveTickerChat,
  saveChatScreenContext,
  saveTickerChatScreen,
} from '../../utils/tickerChatSession';
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
import { AsyncStatePanel, ErrorBanner, Skeleton, TickerAvatar } from '../../components/ui';
import { getRejectedMessage } from '../../utils/apiError';
import {
  buildMarketSessionTooltip,
  buildTickerMarketSessionView,
  getMarketSessionBadgeStyle,
  shouldShowMarketSessionChangeLabel,
} from '../../utils/marketSession';
import {
  convertAmountToDisplayCurrency,
  convertAmountWithRate,
  formatMoney,
  formatSignedMoney,
  getTodayIsoDate,
} from '../../utils/moneyDisplay';
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
const DEFAULT_FX_RATES: Record<Currency, number> = { USD: 1, EUR: 1 };

type StockPeriodValue = (typeof STOCK_PERIODS)[number]['value'];

function resolveTickerFromRouteParam(rawTicker: string): string {
  try {
    return decodeURIComponent(rawTicker).trim().toUpperCase();
  } catch {
    return '';
  }
}

function formatSignedChange(change: number, changePercent: number, currency: Currency): string {
  const changePrefix = change >= 0 ? '+' : '';
  const percentPrefix = changePercent >= 0 ? '+' : '';
  return `${changePrefix}${formatMoney(change, currency)} (${percentPrefix}${changePercent.toFixed(2)}%)`;
}

function convertCandlesToDisplayCurrency(
  candles: OhlcvCandle[],
  fromCurrency: Currency,
  displayCurrency: Currency,
  fxRates: Record<Currency, number>
): OhlcvCandle[] {
  if (fromCurrency === displayCurrency) {
    return candles;
  }

  const fxRate = fxRates[fromCurrency] ?? 1;

  return candles.map((candle) => ({
    ...candle,
    open: convertAmountWithRate(candle.open, fxRate),
    high: convertAmountWithRate(candle.high, fxRate),
    low: convertAmountWithRate(candle.low, fxRate),
    close: convertAmountWithRate(candle.close, fxRate),
  }));
}

export function TickerDetailPage() {
  const { ticker: rawTicker = '' } = useParams<{ ticker: string }>();
  const dispatch = useAppDispatch();
  const displayCurrency = useAppSelector((state) => state.ui.currency);

  const ticker = resolveTickerFromRouteParam(rawTicker);
  const isValidTicker = TICKER_FORMAT_PATTERN.test(ticker);
  const sessionTooltipId = useId();

  const [selectedPeriod, setSelectedPeriod] = useState<StockPeriodValue>(
    DEFAULT_PERIOD as StockPeriodValue
  );
  const [fxRatesState, setFxRatesState] = useState<{
    requestKey: string;
    rates: Record<Currency, number>;
    isReady: boolean;
  }>({
    requestKey: '',
    rates: DEFAULT_FX_RATES,
    isReady: false,
  });
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
  const priceCurrency = (quote?.currency ?? fundamentals?.currency ?? 'USD') as Currency;
  const sourceCurrency = (fundamentals?.currency ?? quote?.currency ?? 'USD') as Currency;

  const fxSourceCurrencies = useMemo(() => {
    const currencies = new Set<Currency>([sourceCurrency, priceCurrency]);

    for (const trade of tickerTransactions) {
      currencies.add(trade.currency as Currency);
    }

    return Array.from(currencies);
  }, [priceCurrency, sourceCurrency, tickerTransactions]);

  const fxRatesRequestKey = useMemo(
    () => `${displayCurrency}|${fxSourceCurrencies.slice().sort().join(',')}`,
    [displayCurrency, fxSourceCurrencies]
  );

  const hasLiveFxRates = fxRatesState.requestKey === fxRatesRequestKey && fxRatesState.isReady;
  const fxRates =
    fxRatesState.requestKey === fxRatesRequestKey ? fxRatesState.rates : DEFAULT_FX_RATES;

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
  const marketSessionBadgeStyle = marketSession
    ? getMarketSessionBadgeStyle(marketSession.normalizedState)
    : null;
  const marketSessionTooltip = marketSession ? buildMarketSessionTooltip(marketSession) : '';

  const displayCandles = useMemo(() => {
    const chartCurrency =
      hasLiveFxRates || priceCurrency === displayCurrency ? displayCurrency : priceCurrency;
    return convertCandlesToDisplayCurrency(candles, priceCurrency, chartCurrency, fxRates);
  }, [candles, displayCurrency, fxRates, hasLiveFxRates, priceCurrency]);

  const tradeMarkers = useMemo(
    () => buildTradeChartMarkers(tickerTransactions, displayCandles),
    [displayCandles, tickerTransactions]
  );

  useEffect(() => {
    if (!isValidTicker || !quote) {
      return;
    }

    saveActiveTickerChat(ticker, quote.name || ticker);
  }, [isValidTicker, quote, ticker]);

  useEffect(() => {
    if (!isValidTicker) {
      if (loadChatScreenContext()?.kind === TICKER_CHAT_SCREEN_TICKER_KIND) {
        saveChatScreenContext(null);
      }
      return;
    }

    saveTickerChatScreen(selectedPeriod);
  }, [isValidTicker, selectedPeriod]);

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
    const requestKey = fxRatesRequestKey;

    void fetchLiveFxRates(fxSourceCurrencies, displayCurrency, getTodayIsoDate())
      .then((rates) => {
        if (!cancelled) {
          setFxRatesState({
            requestKey,
            rates,
            isReady: true,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFxRatesState({
            requestKey,
            rates: DEFAULT_FX_RATES,
            isReady: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayCurrency, fxRatesRequestKey, fxSourceCurrencies]);

  const quoteMoneyCurrency =
    hasLiveFxRates || priceCurrency === displayCurrency ? displayCurrency : priceCurrency;
  const fundamentalsMoneyCurrency =
    hasLiveFxRates || sourceCurrency === displayCurrency ? displayCurrency : sourceCurrency;

  const displayContext = useMemo<CompareDisplayContext>(
    () => ({
      displayCurrency: fundamentalsMoneyCurrency,
      fxRates,
    }),
    [fundamentalsMoneyCurrency, fxRates]
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
  const displayPrice = marketSession
    ? convertAmountToDisplayCurrency(
        marketSession.displayPrice,
        priceCurrency,
        quoteMoneyCurrency,
        fxRates
      )
    : null;
  const displayFiftyTwoWeekLow =
    quote?.fiftyTwoWeekLow != null
      ? convertAmountToDisplayCurrency(
          quote.fiftyTwoWeekLow,
          priceCurrency,
          quoteMoneyCurrency,
          fxRates
        )
      : null;
  const displayFiftyTwoWeekHigh =
    quote?.fiftyTwoWeekHigh != null
      ? convertAmountToDisplayCurrency(
          quote.fiftyTwoWeekHigh,
          priceCurrency,
          quoteMoneyCurrency,
          fxRates
        )
      : null;
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

  if (!isLoadingQuote && !quote && error) {
    return (
      <div className={styles.page}>
        <Link to={ROUTES.DASHBOARD} className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <ErrorBanner message={error} />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
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

          {error && !quote && <ErrorBanner message={error} />}
          {watchlistActionError && <ErrorBanner message={watchlistActionError} />}

          {isInitialLoading ? (
            <AsyncStatePanel
              isLoading
              loadingPreset="page"
              loadingMessage={LOADING_MESSAGES.TICKER_DETAILS}
              className={styles.loadingPanel}
            />
          ) : (
            <>
              <section className={styles.headerCard}>
                <div className={styles.identity}>
                  <TickerAvatar ticker={ticker} logoUrl={quote?.logoUrl ?? null} size="md" />
                  <div className={styles.identityText}>
                    <h2 className={styles.tickerSymbol}>{ticker}</h2>
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
                  {quote && marketSession && marketSessionBadgeStyle && displayPrice != null ? (
                    <>
                      <div className={styles.priceHeader}>
                        <p className={styles.price}>
                          {formatMoney(displayPrice, quoteMoneyCurrency)}
                        </p>
                        <span className={styles.sessionBadgeWrap}>
                          <button
                            type="button"
                            className={`${styles.sessionBadge} ${
                              marketSessionBadgeStyle.tone === 'open'
                                ? styles.sessionBadgeOpen
                                : marketSessionBadgeStyle.tone === 'extended'
                                  ? styles.sessionBadgeExtended
                                  : styles.sessionBadgeClosed
                            }`}
                            aria-describedby={sessionTooltipId}
                          >
                            {marketSessionBadgeStyle.iconKind === 'sun' && (
                              <Sun size={12} aria-hidden />
                            )}
                            {marketSessionBadgeStyle.iconKind === 'moon' && (
                              <Moon size={12} aria-hidden />
                            )}
                            {marketSession.sessionLabel}
                          </button>
                          <span
                            id={sessionTooltipId}
                            role="tooltip"
                            className={styles.sessionTooltip}
                          >
                            {marketSessionTooltip}
                          </span>
                        </span>
                      </div>

                      {marketSession.lines.map((line) => {
                        const isPositive = line.changePercent >= 0;
                        const displayChange = convertAmountToDisplayCurrency(
                          line.change,
                          priceCurrency,
                          quoteMoneyCurrency,
                          fxRates
                        );
                        return (
                          <p
                            key={line.label}
                            className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}
                          >
                            {formatSignedChange(
                              displayChange,
                              line.changePercent,
                              quoteMoneyCurrency
                            )}
                            {shouldShowMarketSessionChangeLabel(
                              line.label,
                              marketSession.sessionLabel
                            ) && <span className={styles.changeLabel}>{line.label}</span>}
                          </p>
                        );
                      })}
                    </>
                  ) : isLoadingQuote ? (
                    <div
                      className={styles.priceSkeleton}
                      role="status"
                      aria-busy="true"
                      aria-label={LOADING_MESSAGES.TICKER_QUOTE}
                    >
                      <Skeleton className={styles.priceValueSkeleton} />
                      <Skeleton className={styles.priceMetaSkeleton} />
                    </div>
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
                  candles={displayCandles}
                  currency={quoteMoneyCurrency}
                  isLoading={isLoadingHistory}
                  tradeMarkers={tradeMarkers}
                  trades={tickerTransactions}
                  fxRates={fxRates}
                />
                <p className={styles.chartZoomHint}>
                  <span className={styles.chartZoomHintPointer}>Ctrl / ⌘ + scroll to zoom</span>
                  <span className={styles.chartZoomHintTouch}>Swipe to move, pinch to zoom</span>
                </p>
              </section>

              {holding && (
                <section className={styles.holdingsCard}>
                  <div className={styles.holdingsHeader}>
                    <h2 className={styles.sectionTitle}>Your position</h2>
                    <Link
                      to={`${ROUTES.PORTFOLIO}?section=positions`}
                      className={styles.holdingsLink}
                    >
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
                      loadingPreset="stats"
                      loadingMessage={LOADING_MESSAGES.TICKER_FUNDAMENTALS}
                      className={styles.loadingPanel}
                    />
                  ) : detailMetrics.length === 0 &&
                    !(quote?.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null) ? (
                    <p className={styles.companyName}>
                      Fundamentals are unavailable for this ticker.
                    </p>
                  ) : (
                    <dl className={styles.statsList}>
                      {detailMetrics.map((metric) => {
                        if (!fundamentals) {
                          return null;
                        }

                        const secondaryValue = getCompareMetricSecondaryValue(
                          metric.key,
                          fundamentals
                        );

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

                      {displayFiftyTwoWeekLow != null && displayFiftyTwoWeekHigh != null && (
                        <div className={styles.statsRow}>
                          <dt className={styles.statLabel}>52-Week Range</dt>
                          <dd className={styles.statValue}>
                            {formatMoney(displayFiftyTwoWeekLow, quoteMoneyCurrency)} –{' '}
                            {formatMoney(displayFiftyTwoWeekHigh, quoteMoneyCurrency)}
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
      </div>
    </div>
  );
}
