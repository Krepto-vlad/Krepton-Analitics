import { useEffect, useState } from 'react';
import { fetchStockHistory, fetchStockQuotesBatch } from '../api/stockApi';
import {
  DASHBOARD_INDEX_HISTORY_INTERVAL,
  DASHBOARD_INDEX_HISTORY_PERIOD,
  DASHBOARD_INDEX_REFRESH_INTERVAL_MS,
} from '../constants';
import type { OhlcvCandle, StockQuote } from '../types/stock.types';

export type MarketIndexLoadStatus = 'loading' | 'ready' | 'error';

export interface MarketIndexData {
  status: MarketIndexLoadStatus;
  quote: StockQuote | null;
  candles: OhlcvCandle[];
}

export const LOADING_MARKET_INDEX_DATA: MarketIndexData = {
  status: 'loading',
  quote: null,
  candles: [],
};

async function loadMarketIndexData(
  tickers: readonly string[]
): Promise<Record<string, MarketIndexData>> {
  const [quotesResult, ...historyResults] = await Promise.allSettled([
    fetchStockQuotesBatch([...tickers]),
    ...tickers.map((ticker) =>
      fetchStockHistory(ticker, DASHBOARD_INDEX_HISTORY_PERIOD, DASHBOARD_INDEX_HISTORY_INTERVAL)
    ),
  ]);
  const quotes = quotesResult.status === 'fulfilled' ? quotesResult.value : [];

  return Object.fromEntries(
    tickers.map((ticker, tickerIndex) => {
      const historyResult = historyResults[tickerIndex];
      const quote = quotes.find((item) => item.ticker === ticker) ?? null;
      const candles = historyResult.status === 'fulfilled' ? historyResult.value.candles : [];
      const status: MarketIndexLoadStatus =
        quote !== null || candles.length > 0 ? 'ready' : 'error';

      return [ticker, { status, quote, candles }];
    })
  );
}

/**
 * Quote (today's move) and one month of daily closes for each requested index.
 * Refreshes on an interval and keeps the last good data while a refresh runs.
 */
export function useMarketIndexData(tickers: readonly string[]): Record<string, MarketIndexData> {
  const [dataByTicker, setDataByTicker] = useState<Record<string, MarketIndexData>>({});
  const tickersKey = tickers.join(',');

  useEffect(() => {
    if (tickersKey.length === 0) {
      return;
    }

    const requestedTickers = tickersKey.split(',');
    let isCancelled = false;

    async function refresh(): Promise<void> {
      const loadedData = await loadMarketIndexData(requestedTickers);
      if (!isCancelled) {
        setDataByTicker((current) => ({ ...current, ...loadedData }));
      }
    }

    void refresh();
    const refreshTimer = window.setInterval(
      () => void refresh(),
      DASHBOARD_INDEX_REFRESH_INTERVAL_MS
    );

    return () => {
      isCancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [tickersKey]);

  return dataByTicker;
}
