import fc from 'fast-check';
import { TICKER_MAX_LENGTH } from '../../constants.js';
import type { TradeFingerprintInput } from '../../utils/tradeFingerprint.js';
import {
  CENTS_PER_UNIT,
  FIRST_TRADE_DATE,
  ISO_DATE_LENGTH,
  LAST_TRADE_DATE,
  MAX_PRICE_CENTS,
  MAX_SHARE_UNITS,
  SHARE_UNITS_PER_SHARE,
  TICKER_ALPHABET,
} from './propertyConstants.js';

/** A ticker that satisfies the application rule and the database CHECK. */
export const validTickerArbitrary: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...TICKER_ALPHABET), { minLength: 1, maxLength: TICKER_MAX_LENGTH })
  .map((characters) => characters.join(''));

export const isoDateArbitrary: fc.Arbitrary<string> = fc
  .date({ min: FIRST_TRADE_DATE, max: LAST_TRADE_DATE, noInvalidDate: true })
  .map((date) => date.toISOString().slice(0, ISO_DATE_LENGTH));

/** Share quantities with four decimals, which PostgreSQL stores exactly. */
export const sharesArbitrary: fc.Arbitrary<number> = fc
  .integer({ min: 1, max: MAX_SHARE_UNITS })
  .map((units) => units / SHARE_UNITS_PER_SHARE);

/** Prices in whole cents, so every product is a multiple of one cent. */
export const priceArbitrary: fc.Arbitrary<number> = fc
  .integer({ min: 1, max: MAX_PRICE_CENTS })
  .map((cents) => cents / CENTS_PER_UNIT);

export const transactionTypeArbitrary: fc.Arbitrary<'BUY' | 'SELL'> = fc.constantFrom(
  'BUY' as const,
  'SELL' as const
);

export const tradeArbitrary: fc.Arbitrary<TradeFingerprintInput> = fc.record({
  ticker: validTickerArbitrary,
  transactionDate: isoDateArbitrary,
  transactionType: transactionTypeArbitrary,
  shares: sharesArbitrary,
  pricePerShare: priceArbitrary,
});
