import type { StockQuote } from '../types/stock.types.js';

/** Empty quote used when Yahoo data is missing or as a placeholder seed. */
export function buildEmptyStockQuote(ticker: string): StockQuote {
  return {
    ticker,
    name: ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: null,
    currency: 'USD',
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    logoUrl: null,
    marketState: null,
    exchange: null,
    preMarketPrice: null,
    preMarketChange: null,
    preMarketChangePercent: null,
    postMarketPrice: null,
    postMarketChange: null,
    postMarketChangePercent: null,
  };
}
