import {
  STOCK_EXCHANGE_TIME_ZONES,
  STOCK_MARKET_SESSION_LABELS,
  STOCK_MARKET_SESSION_TIME_PREFIX,
  STOCK_MARKET_SESSION_TOOLTIP_STATUS,
  STOCK_MARKET_SESSION_US_HOURS_HINT,
  STOCK_US_EASTERN_TIME_ZONE,
} from '../constants';
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

export type MarketSessionIconKind = 'sun' | 'moon' | null;
export type MarketSessionBadgeTone = 'open' | 'extended' | 'closed';

export interface MarketSessionBadgeStyle {
  iconKind: MarketSessionIconKind;
  tone: MarketSessionBadgeTone;
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

export function getMarketSessionBadgeStyle(state: NormalizedMarketState): MarketSessionBadgeStyle {
  if (state === 'REGULAR') {
    return { iconKind: 'sun', tone: 'open' };
  }

  if (state === 'PRE' || state === 'POST') {
    return { iconKind: 'moon', tone: 'extended' };
  }

  if (state === 'CLOSED') {
    return { iconKind: 'moon', tone: 'closed' };
  }

  return { iconKind: null, tone: 'closed' };
}

export function shouldShowMarketSessionChangeLabel(
  lineLabel: string,
  sessionLabel: string
): boolean {
  return lineLabel !== sessionLabel;
}

function normalizeExchangeKey(exchange: string): string {
  return exchange
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}

export function resolveExchangeTimeZone(exchange: string | null): string | null {
  if (!exchange) {
    return null;
  }

  return STOCK_EXCHANGE_TIME_ZONES[normalizeExchangeKey(exchange)] ?? null;
}

function formatSessionClock(now: Date, timeZone: string | null): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Intl.DateTimeFormat('en-US', options).format(now);
}

export function buildMarketSessionTooltip(
  session: Pick<TickerMarketSessionView, 'normalizedState' | 'exchange'>,
  now: Date = new Date()
): string {
  const status = STOCK_MARKET_SESSION_TOOLTIP_STATUS[session.normalizedState];
  const exchangeTimeZone = resolveExchangeTimeZone(session.exchange);
  const clock = formatSessionClock(now, exchangeTimeZone);
  const timePrefix = exchangeTimeZone
    ? STOCK_MARKET_SESSION_TIME_PREFIX.EXCHANGE
    : STOCK_MARKET_SESSION_TIME_PREFIX.LOCAL;
  const exchangeSuffix = session.exchange ? ` (${session.exchange})` : '';
  const lines = [status, `${timePrefix}: ${clock}${exchangeSuffix}.`];

  const hoursHint =
    exchangeTimeZone === STOCK_US_EASTERN_TIME_ZONE
      ? STOCK_MARKET_SESSION_US_HOURS_HINT[session.normalizedState]
      : null;

  if (hoursHint) {
    lines.push(hoursHint);
  }

  return lines.join('\n');
}
