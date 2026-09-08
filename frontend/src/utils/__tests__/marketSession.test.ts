import {
  STOCK_MARKET_SESSION_LABELS,
  STOCK_MARKET_SESSION_TIME_PREFIX,
  STOCK_MARKET_SESSION_TOOLTIP_STATUS,
  STOCK_MARKET_SESSION_US_HOURS_HINT,
} from '../../constants';
import type { StockQuote } from '../../types/stock.types';
import {
  buildMarketSessionTooltip,
  buildTickerMarketSessionView,
  getMarketSessionBadgeStyle,
  resolveExchangeTimeZone,
  shouldShowMarketSessionChangeLabel,
} from '../marketSession';

function makeQuote(overrides: Partial<StockQuote> = {}): StockQuote {
  return {
    ticker: 'TTWO',
    name: 'Take-Two Interactive Software, Inc.',
    price: 214.03,
    change: -0.66,
    changePercent: -0.31,
    volume: 1,
    marketCap: null,
    currency: 'USD',
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    logoUrl: null,
    marketState: 'REGULAR',
    exchange: 'NasdaqGS',
    preMarketPrice: null,
    preMarketChange: null,
    preMarketChangePercent: null,
    postMarketPrice: null,
    postMarketChange: null,
    postMarketChangePercent: null,
    ...overrides,
  };
}

describe('marketSession', () => {
  it('does not repeat the session badge label on the regular-session change line', () => {
    const view = buildTickerMarketSessionView(makeQuote());

    expect(view.sessionLabel).toBe(STOCK_MARKET_SESSION_LABELS.REGULAR);
    expect(view.lines[0]?.label).toBe(STOCK_MARKET_SESSION_LABELS.REGULAR);
    expect(shouldShowMarketSessionChangeLabel(view.lines[0]?.label ?? '', view.sessionLabel)).toBe(
      false
    );
  });

  it('keeps At close on the closed-session change line', () => {
    const view = buildTickerMarketSessionView(makeQuote({ marketState: 'CLOSED' }));

    expect(view.sessionLabel).toBe(STOCK_MARKET_SESSION_LABELS.CLOSED);
    expect(view.lines[0]?.label).toBe(STOCK_MARKET_SESSION_LABELS.AT_CLOSE);
    expect(shouldShowMarketSessionChangeLabel(view.lines[0]?.label ?? '', view.sessionLabel)).toBe(
      true
    );
  });

  it('uses a sun for open and a moon for overnight sessions', () => {
    expect(getMarketSessionBadgeStyle('REGULAR')).toEqual({ iconKind: 'sun', tone: 'open' });
    expect(getMarketSessionBadgeStyle('PRE')).toEqual({ iconKind: 'moon', tone: 'extended' });
    expect(getMarketSessionBadgeStyle('POST')).toEqual({ iconKind: 'moon', tone: 'extended' });
    expect(getMarketSessionBadgeStyle('CLOSED')).toEqual({ iconKind: 'moon', tone: 'closed' });
  });

  it('maps NasdaqGS to US Eastern time', () => {
    expect(resolveExchangeTimeZone('NasdaqGS')).toBe('America/New_York');
  });

  it('builds an open-session tooltip with exchange clock and typical hours', () => {
    const view = buildTickerMarketSessionView(makeQuote());
    const tooltip = buildMarketSessionTooltip(view, new Date('2026-09-08T15:00:00.000Z'));

    expect(tooltip).toContain(STOCK_MARKET_SESSION_TOOLTIP_STATUS.REGULAR);
    expect(tooltip).toContain(STOCK_MARKET_SESSION_TIME_PREFIX.EXCHANGE);
    expect(tooltip).toContain('NasdaqGS');
    expect(tooltip).toContain('11:00');
    expect(tooltip).toContain(STOCK_MARKET_SESSION_US_HOURS_HINT.REGULAR);
  });

  it('falls back to local time when the exchange zone is unknown', () => {
    const view = buildTickerMarketSessionView(makeQuote({ exchange: 'UnknownVenue' }));
    const tooltip = buildMarketSessionTooltip(view, new Date('2026-09-08T15:00:00.000Z'));

    expect(tooltip).toContain(STOCK_MARKET_SESSION_TIME_PREFIX.LOCAL);
    expect(tooltip).not.toContain(STOCK_MARKET_SESSION_US_HOURS_HINT.REGULAR);
  });
});
