import type { RootState } from '../../store';
import { DEFAULT_INTERVAL, DEFAULT_PERIOD } from '../../constants';
import { buildTickerHistoryCacheKey, normalizeTicker } from './tickerSlice';
import type { NewsItem } from '../../types/portfolio.types';
import type { StockCompareItem, StockHistoryResponse, StockQuote } from '../../types/stock.types';

export function selectTickerQuote(state: RootState, ticker: string): StockQuote | null {
  return state.ticker.quotesByTicker[normalizeTicker(ticker)]?.data ?? null;
}

export function selectTickerHistory(
  state: RootState,
  ticker: string,
  period: string = DEFAULT_PERIOD,
  interval: string = DEFAULT_INTERVAL
): StockHistoryResponse | null {
  const cacheKey = buildTickerHistoryCacheKey(ticker, period, interval);
  return state.ticker.historyByKey[cacheKey]?.data ?? null;
}

export function selectTickerFundamentals(
  state: RootState,
  ticker: string
): StockCompareItem | null {
  return state.ticker.fundamentalsByTicker[normalizeTicker(ticker)]?.data ?? null;
}

export function selectTickerNews(state: RootState, ticker: string): NewsItem[] {
  return state.ticker.newsByTicker[normalizeTicker(ticker)]?.data ?? [];
}
