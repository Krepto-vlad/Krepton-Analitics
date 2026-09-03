import { STOCK_MARKET_SESSION_LABELS } from '../constants';
import type { StockQuote } from '../types/stock.types';

export type NormalizedMarketState = 'PRE' | 'REGULAR' | 'POST' | 'CLOSED' | 'UNKNOWN';

export interface MarketSessionChangeLine {
  change: number;
  changePercent: number;
  label: string;
}

export interface TickerMarketSessionView {
  displayPrice: number;
  sessionLabel: string;
  normalizedState: NormalizedMarketState;
  exchange: string | null;
  lines: MarketSessionChangeLine[];
}

function normalizeMarketState(marketState: string | null | undefined): NormalizedMarketState {
  const normalized = marketState?.trim().toUpperCase() ?? '';

  if (normalized === 'PRE' || normalized === 'PREPRE') {
    return 'PRE';
  }
  if (normalized === 'POST' || normalized === 'POSTPOST') {
    return 'POST';
  }
  if (normalized === 'REGULAR') {
    return 'REGULAR';
  }
  if (normalized === 'CLOSED') {
    return 'CLOSED';
  }

  return 'UNKNOWN';
}

function hasFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function buildRegularSessionLine(quote: StockQuote): MarketSessionChangeLine {
  return {
    change: quote.change,
    changePercent: quote.changePercent,
    label: STOCK_MARKET_SESSION_LABELS.AT_CLOSE,
  };
}

/**
 * Builds Revolut-style price session context from Yahoo quote fields.
 * Yahoo's marketState already reflects the listing exchange (US vs Europe).
 */
export function buildTickerMarketSessionView(quote: StockQuote): TickerMarketSessionView {
  const normalizedState = normalizeMarketState(quote.marketState);
  const exchange = quote.exchange?.trim() || null;

  if (normalizedState === 'PRE') {
    const lines: MarketSessionChangeLine[] = [];

    if (hasFiniteNumber(quote.preMarketChange) && hasFiniteNumber(quote.preMarketChangePercent)) {
      lines.push({
        change: quote.preMarketChange,
        changePercent: quote.preMarketChangePercent,
        label: STOCK_MARKET_SESSION_LABELS.PRE,
      });
    }

    lines.push(buildRegularSessionLine(quote));

    return {
      displayPrice: hasFiniteNumber(quote.preMarketPrice) ? quote.preMarketPrice : quote.price,
      sessionLabel: STOCK_MARKET_SESSION_LABELS.PRE,
      normalizedState,
      exchange,
      lines,
    };
  }

  if (normalizedState === 'POST') {
    const lines: MarketSessionChangeLine[] = [];

    if (hasFiniteNumber(quote.postMarketChange) && hasFiniteNumber(quote.postMarketChangePercent)) {
      lines.push({
        change: quote.postMarketChange,
        changePercent: quote.postMarketChangePercent,
        label: STOCK_MARKET_SESSION_LABELS.POST,
      });
    }

    lines.push(buildRegularSessionLine(quote));

    return {
      displayPrice: hasFiniteNumber(quote.postMarketPrice) ? quote.postMarketPrice : quote.price,
      sessionLabel: STOCK_MARKET_SESSION_LABELS.POST,
      normalizedState,
      exchange,
      lines,
    };
  }

  if (normalizedState === 'REGULAR') {
    return {
      displayPrice: quote.price,
      sessionLabel: STOCK_MARKET_SESSION_LABELS.REGULAR,
      normalizedState,
      exchange,
      lines: [
        {
          change: quote.change,
          changePercent: quote.changePercent,
          label: STOCK_MARKET_SESSION_LABELS.REGULAR,
        },
      ],
    };
  }

  if (normalizedState === 'CLOSED') {
    return {
      displayPrice: quote.price,
      sessionLabel: STOCK_MARKET_SESSION_LABELS.CLOSED,
      normalizedState,
      exchange,
      lines: [buildRegularSessionLine(quote)],
    };
  }

  return {
    displayPrice: quote.price,
    sessionLabel: STOCK_MARKET_SESSION_LABELS.UNKNOWN,
    normalizedState,
    exchange,
    lines: [
      {
        change: quote.change,
        changePercent: quote.changePercent,
        label: STOCK_MARKET_SESSION_LABELS.UNKNOWN,
      },
    ],
  };
}
