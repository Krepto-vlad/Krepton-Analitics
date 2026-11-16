import { useEffect, useState } from 'react';
import {
  DEFAULT_INTERVAL,
  STOCK_PERIODS,
  TICKER_CHAT_INLINE_CHART_HEIGHT_PX,
} from '../../../constants';
import type { StockChartPeriod } from '../../../constants';
import { fetchStockHistory, fetchStockQuote } from '../../../api/stockApi';
import { useTickerPriceChart } from '../../../hooks/useTickerPriceChart';
import type { OhlcvCandle, StockQuote } from '../../../types/stock.types';
import { toCssCustomProperties } from '../../../utils/cssCustomProperties';
import styles from './TickerChatDrawer.module.scss';

interface ChatTickerChartCardProps {
  ticker: string;
}

function formatChartChange(changePercent: number): string {
  const sign = changePercent > 0 ? '+' : '';
  return `${sign}${changePercent.toFixed(2)}%`;
}

/**
 * Same price chart as the ticker page, drawn inside a chat reply
 * when that ticker is not already open.
 */
export function ChatTickerChartCard({ ticker }: ChatTickerChartCardProps) {
  const [period, setPeriod] = useState<StockChartPeriod>(STOCK_PERIODS[0].value);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<OhlcvCandle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { containerRef } = useTickerPriceChart(candles, quote?.currency ?? 'USD');
  const chartStyle = toCssCustomProperties({
    '--chat-inline-chart-height': `${TICKER_CHAT_INLINE_CHART_HEIGHT_PX}px`,
  });

  useEffect(() => {
    let isCancelled = false;

    void fetchStockQuote(ticker)
      .then((nextQuote) => {
        if (!isCancelled) {
          setQuote(nextQuote);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setQuote(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    let isCancelled = false;

    void fetchStockHistory(ticker, period, DEFAULT_INTERVAL)
      .then((history) => {
        if (!isCancelled) {
          setCandles(history.candles);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCandles([]);
          setErrorMessage('Chart is unavailable right now.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [ticker, period]);

  const changePercent = quote?.changePercent ?? 0;
  const changeClassName =
    changePercent < 0 ? styles.inlineChartChangeDown : styles.inlineChartChangeUp;

  return (
    <section className={styles.inlineChart} aria-label={`${ticker} price chart`}>
      <div className={styles.inlineChartHeader}>
        <div>
          <p className={styles.inlineChartTicker}>{ticker}</p>
          <p className={styles.inlineChartPrice}>
            {quote ? `${quote.currency} ${quote.price.toFixed(2)}` : ticker}
          </p>
        </div>
        {quote ? <p className={changeClassName}>{formatChartChange(quote.changePercent)}</p> : null}
      </div>
      <div className={styles.inlineChartPeriods} role="group" aria-label="Chart period">
        {STOCK_PERIODS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              option.value === period
                ? `${styles.inlineChartPeriod} ${styles.inlineChartPeriodActive}`
                : styles.inlineChartPeriod
            }
            aria-pressed={option.value === period}
            onClick={() => {
              if (option.value === period) {
                return;
              }

              setPeriod(option.value);
              setIsLoading(true);
              setErrorMessage(null);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className={styles.inlineChartCanvas} style={chartStyle} />
      {isLoading ? <p className={styles.inlineChartStatus}>Loading chart…</p> : null}
      {errorMessage ? <p className={styles.inlineChartStatus}>{errorMessage}</p> : null}
    </section>
  );
}
