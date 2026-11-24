/** Number of generated cases per property. Failures print the seed so they can be replayed. */
export const PROPERTY_RUN_COUNT = 300;

/** Smaller run count for properties that talk to PostgreSQL. */
export const DATABASE_PROPERTY_RUN_COUNT = 40;

/** Every character a ticker may contain (see TICKER_FORMAT_PATTERN and the database CHECK). */
export const TICKER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.=^-';

/**
 * The CHECK expression of `positions_ticker_format_check`, `transactions_ticker_format_check`
 * and `watchlist_items_ticker_format_check` in migration 1751370012000.
 */
export const DATABASE_TICKER_PATTERN = /^[A-Z0-9.=^-]{1,10}$/;

export const MAX_SHARE_UNITS = 99_999_999;
export const SHARE_UNITS_PER_SHARE = 10_000;
export const MAX_PRICE_CENTS = 99_999_999;
export const CENTS_PER_UNIT = 100;
export const MAX_CONVERTIBLE_AMOUNT = 1_000_000;
export const MAX_FX_RATE = 1_000;
export const MIN_FX_RATE = 0.0001;
export const MONEY_ROUNDING_TOLERANCE = 0.005 + 1e-9;

export const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;
export const FIRST_TRADE_DATE = new Date('2000-01-01T00:00:00Z');
export const LAST_TRADE_DATE = new Date('2030-12-31T00:00:00Z');
