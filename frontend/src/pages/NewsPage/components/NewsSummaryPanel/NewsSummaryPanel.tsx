import { useEffect, useMemo, useState } from 'react';
import { CircleHelp, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import {
  AiGeneratedNotice,
  ContentSkeleton,
  Skeleton,
  TickerAvatar,
} from '../../../../components/ui';
import {
  AI_NEWS_BRIEFING_COST_BASIS_TOOLTIP,
  AI_NEWS_BRIEFING_SP500_LABEL,
  AI_NEWS_BRIEFING_SP500_TICKER,
  AI_NEWS_SUMMARY_MAX_TICKERS,
  AI_NEWS_SUMMARY_MIN_TICKERS,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
} from '../../../../constants';
import { fetchNewsSummaryQuota, generateNewsSummary } from '../../../../api/portfolioApi';
import { fetchStockQuote } from '../../../../api/stockApi';
import type { PortfolioPosition } from '../../../../types/portfolio.types';
import type {
  AiQuotaStatus,
  NewsSummaryMarketBenchmark,
  NewsSummaryResponse,
} from '../../../../types/ai.types';
import { getRejectedMessage } from '../../../../utils/apiError';
import {
  clearPersistedNewsBriefing,
  loadPersistedNewsBriefing,
  savePersistedNewsBriefing,
} from '../../../../utils/newsBriefingStorage';
import { buildLogoByTicker } from '../../../../utils/tickerLogos';
import styles from './NewsSummaryPanel.module.scss';

interface NewsSummaryPanelProps {
  holdings: PortfolioPosition[];
  holdingsKey: string;
}

function formatQuotaReset(resetsAt: string): string {
  const resetDate = new Date(resetsAt);
  if (Number.isNaN(resetDate.getTime())) {
    return 'midnight UTC';
  }

  return resetDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatSignedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatPrice(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getSentimentLabel(
  sentiment: NewsSummaryResponse['holdingInsights'][number]['sentiment']
): string {
  if (sentiment === 'bullish') return 'Bullish';
  if (sentiment === 'bearish') return 'Bearish';
  return 'Neutral';
}

function getChangeClassName(changePercent: number | null): string {
  if (changePercent === null || Number.isNaN(changePercent) || changePercent === 0) {
    return styles.changeNeutral;
  }

  return changePercent > 0 ? styles.changePositive : styles.changeNegative;
}

export function NewsSummaryPanel({ holdings, holdingsKey }: NewsSummaryPanelProps) {
  const availableTickers = useMemo(
    () => [
      ...new Map(holdings.map((position) => [position.ticker.toUpperCase(), position])).values(),
    ],
    [holdings]
  );

  const logoByTicker = useMemo(() => buildLogoByTicker(holdings), [holdings]);

  const availableTickerSymbols = useMemo(
    () => availableTickers.map((position) => position.ticker.toUpperCase()),
    [availableTickers]
  );

  const defaultSelectedTickers = useMemo(
    () => availableTickers.slice(0, AI_NEWS_SUMMARY_MAX_TICKERS).map((position) => position.ticker),
    [availableTickers]
  );

  const persistedBriefing = useMemo(
    () => loadPersistedNewsBriefing(holdingsKey, availableTickerSymbols),
    [holdingsKey, availableTickerSymbols]
  );

  const [selectedTickers, setSelectedTickers] = useState<string[]>(
    () => persistedBriefing?.selectedTickers ?? defaultSelectedTickers
  );
  const [includePortfolioContext, setIncludePortfolioContext] = useState(
    () => persistedBriefing?.includePortfolioContext ?? false
  );
  const [quota, setQuota] = useState<AiQuotaStatus | null>(
    () => persistedBriefing?.summary.quota ?? null
  );
  const [summary, setSummary] = useState<NewsSummaryResponse | null>(
    () => persistedBriefing?.summary ?? null
  );
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedMarketBenchmark, setFetchedMarketBenchmark] =
    useState<NewsSummaryMarketBenchmark | null>(null);

  const marketBenchmark =
    summary?.marketBenchmark && summary.marketBenchmark.price > 0
      ? summary.marketBenchmark
      : fetchedMarketBenchmark;

  useEffect(() => {
    if (availableTickers.length === 0) {
      return;
    }

    let isCancelled = false;

    async function loadInitialQuota() {
      setIsLoadingQuota(true);
      try {
        const nextQuota = await fetchNewsSummaryQuota();
        if (!isCancelled) {
          setQuota(nextQuota);
        }
      } catch (quotaError) {
        if (!isCancelled) {
          setError(getRejectedMessage(quotaError, ERROR_MESSAGES.AI_NEWS_SUMMARY_QUOTA_FAILED));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingQuota(false);
        }
      }
    }

    void loadInitialQuota();

    return () => {
      isCancelled = true;
    };
  }, [availableTickers.length]);

  useEffect(() => {
    if (!summary) {
      return;
    }

    if (summary.marketBenchmark && summary.marketBenchmark.price > 0) {
      return;
    }

    if (fetchedMarketBenchmark && fetchedMarketBenchmark.price > 0) {
      return;
    }

    const summarySnapshot = summary;
    let isCancelled = false;

    async function loadSp500Benchmark() {
      try {
        const quote = await fetchStockQuote(AI_NEWS_BRIEFING_SP500_TICKER);
        if (isCancelled || !quote || quote.price <= 0) {
          return;
        }

        const nextBenchmark: NewsSummaryMarketBenchmark = {
          ticker: AI_NEWS_BRIEFING_SP500_TICKER,
          label: AI_NEWS_BRIEFING_SP500_LABEL,
          price: quote.price,
          changePercent: quote.changePercent,
        };

        setFetchedMarketBenchmark(nextBenchmark);
        savePersistedNewsBriefing({
          holdingsKey,
          selectedTickers,
          includePortfolioContext,
          summary: {
            ...summarySnapshot,
            marketBenchmark: nextBenchmark,
          },
        });
      } catch {
        // Benchmark is decorative — keep briefing visible without it.
      }
    }

    void loadSp500Benchmark();

    return () => {
      isCancelled = true;
    };
  }, [summary, fetchedMarketBenchmark, holdingsKey, selectedTickers, includePortfolioContext]);

  function clearBriefingState(): void {
    setSummary(null);
    setFetchedMarketBenchmark(null);
    clearPersistedNewsBriefing();
  }

  function toggleTicker(ticker: string) {
    setError(null);
    clearBriefingState();

    setSelectedTickers((current) => {
      const normalizedTicker = ticker.toUpperCase();

      if (current.includes(normalizedTicker)) {
        return current.filter((item) => item !== normalizedTicker);
      }

      if (current.length >= AI_NEWS_SUMMARY_MAX_TICKERS) {
        return current;
      }

      return [...current, normalizedTicker];
    });
  }

  async function handleGenerateSummary() {
    if (selectedTickers.length < AI_NEWS_SUMMARY_MIN_TICKERS) {
      setError(`Select at least ${AI_NEWS_SUMMARY_MIN_TICKERS} ticker.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateNewsSummary({
        tickers: selectedTickers,
        includePortfolioContext,
      });
      setSummary(response);
      setFetchedMarketBenchmark(null);
      setQuota(response.quota);
      savePersistedNewsBriefing({
        holdingsKey,
        selectedTickers,
        includePortfolioContext,
        summary: response,
      });
    } catch (generateError) {
      clearBriefingState();
      setError(getRejectedMessage(generateError, ERROR_MESSAGES.AI_NEWS_SUMMARY_FAILED));
      try {
        const nextQuota = await fetchNewsSummaryQuota();
        setQuota(nextQuota);
      } catch {
        // Keep existing quota display if refresh fails.
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const canGenerate =
    availableTickers.length > 0 &&
    selectedTickers.length >= AI_NEWS_SUMMARY_MIN_TICKERS &&
    !isGenerating &&
    (quota === null || quota.remaining > 0);

  if (availableTickers.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <Sparkles size={18} className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>AI Daily Briefing</h2>
            <p className={styles.subtitle}>
              Add portfolio holdings to generate a Gemini-powered market briefing.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <Sparkles size={18} className={styles.headerIcon} />
        <div className={styles.headerText}>
          <h2 className={styles.title}>AI Daily Briefing</h2>
          <p className={styles.subtitle}>
            Today&apos;s price action, market context, and holdings analysis for up to{' '}
            {AI_NEWS_SUMMARY_MAX_TICKERS} tickers.
          </p>
        </div>
        {quota && (
          <span className={styles.quotaBadge}>
            {quota.remaining} of {quota.limit} left today
          </span>
        )}
        {isLoadingQuota && !quota && (
          <span
            className={styles.quotaBadge}
            aria-busy="true"
            aria-label={LOADING_MESSAGES.AI_QUOTA}
          >
            <Skeleton className={styles.quotaSkeleton} />
          </span>
        )}
      </div>

      <div className={styles.tickerRow}>
        {availableTickers.map((position) => {
          const ticker = position.ticker.toUpperCase();
          const isSelected = selectedTickers.includes(ticker);
          const isDisabled = !isSelected && selectedTickers.length >= AI_NEWS_SUMMARY_MAX_TICKERS;

          return (
            <button
              key={position.id}
              type="button"
              className={`${styles.tickerChip} ${isSelected ? styles.tickerChipSelected : ''}`}
              onClick={() => toggleTicker(ticker)}
              disabled={isDisabled}
              aria-pressed={isSelected}
            >
              ${ticker}
            </button>
          );
        })}
      </div>

      <div className={styles.contextToggleRow}>
        <label className={styles.contextToggle}>
          <input
            type="checkbox"
            checked={includePortfolioContext}
            onChange={(event) => {
              setIncludePortfolioContext(event.target.checked);
              clearBriefingState();
              setError(null);
            }}
          />
          <span>Include my cost basis (shares, avg price, unrealized P/L)</span>
        </label>
        <span className={styles.contextToggleHelpWrap}>
          <button
            type="button"
            className={styles.contextToggleHelpButton}
            aria-label="Cost basis option help"
            aria-describedby="cost-basis-tooltip"
          >
            <CircleHelp size={18} />
          </button>
          <span id="cost-basis-tooltip" role="tooltip" className={styles.contextToggleTooltip}>
            {AI_NEWS_BRIEFING_COST_BASIS_TOOLTIP}
          </span>
        </span>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={() => void handleGenerateSummary()}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              {LOADING_MESSAGES.AI_NEWS_BRIEFING}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate today&apos;s briefing
            </>
          )}
        </button>

        {quota && quota.remaining === 0 && (
          <p className={styles.limitHint}>
            Daily limit reached. Resets around {formatQuotaReset(quota.resetsAt)}.
          </p>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {isGenerating && !summary && (
        <ContentSkeleton preset="stats" label={LOADING_MESSAGES.AI_NEWS_BRIEFING} />
      )}

      {summary && (
        <div className={styles.summaryBlock}>
          <div className={styles.summaryMeta}>
            <span>Briefing for {summary.summaryDate}</span>
            {summary.fromCache && <span className={styles.cacheBadge}>Cached today</span>}
            {summary.groundingEnabled && (
              <span className={styles.groundingBadge}>Google Search grounding</span>
            )}
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>What&apos;s happening with your holdings</h3>
            <div className={styles.insightsGrid}>
              {summary.holdingInsights.map((insight) => (
                <article key={insight.ticker} className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <div className={styles.insightIdentity}>
                      <TickerAvatar
                        ticker={insight.ticker}
                        logoUrl={logoByTicker[insight.ticker.toUpperCase()] ?? null}
                        size="sm"
                      />
                      <div>
                        <span className={styles.insightTicker}>${insight.ticker}</span>
                        <p className={styles.insightCompany}>{insight.companyName}</p>
                      </div>
                    </div>
                    <span
                      className={`${styles.sentiment} ${styles[`sentiment_${insight.sentiment}`]}`}
                    >
                      {getSentimentLabel(insight.sentiment)}
                    </span>
                  </div>

                  <div className={styles.priceRow}>
                    <span className={styles.priceValue}>
                      {formatPrice(insight.price, insight.currency)}
                    </span>
                    <span className={getChangeClassName(insight.changePercent)}>
                      {formatSignedPercent(insight.changePercent)}
                    </span>
                  </div>

                  {summary.includePortfolioContext &&
                    insight.shares !== undefined &&
                    insight.avgBuyPrice !== undefined && (
                      <p className={styles.positionMeta}>
                        {insight.shares} shares @{' '}
                        {formatPrice(insight.avgBuyPrice, insight.currency)}
                        {' · '}
                        Unrealized {formatSignedPercent(insight.unrealizedPnlPercent ?? null)}
                      </p>
                    )}

                  <p className={styles.summaryText}>{insight.summary}</p>

                  {insight.highlights.length > 0 && (
                    <ul className={styles.highlightsList}>
                      {insight.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          {summary.marketDrivers.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Why the market moved today</h3>
                {marketBenchmark && (
                  <div
                    className={styles.benchmarkBadge}
                    title={`${marketBenchmark.label} via ${marketBenchmark.ticker}`}
                  >
                    <span className={styles.benchmarkLabel}>{marketBenchmark.label}</span>
                    <span className={styles.benchmarkPrice}>
                      {formatPrice(marketBenchmark.price, 'USD')}
                    </span>
                    <span className={getChangeClassName(marketBenchmark.changePercent)}>
                      {formatSignedPercent(marketBenchmark.changePercent)}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.driversList}>
                {summary.marketDrivers.map((driver) => (
                  <article key={driver.title} className={styles.driverCard}>
                    <h4 className={styles.driverTitle}>{driver.title}</h4>
                    <p className={styles.driverText}>{driver.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {summary.sources.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Sources</h3>
              <ul className={styles.sourcesList}>
                {summary.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceLink}
                    >
                      {source.title}
                      <ExternalLink size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AiGeneratedNotice />
          <p className={styles.disclaimer}>{summary.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
