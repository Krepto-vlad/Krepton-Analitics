import fc from 'fast-check';
import { buildTradeFingerprint } from '../../utils/tradeFingerprint.js';
import { tradeArbitrary, sharesArbitrary, priceArbitrary } from './arbitraries.js';
import { PROPERTY_RUN_COUNT } from './propertyConstants.js';

const FINGERPRINT_SEPARATOR = '|';
const FINGERPRINT_PART_COUNT = 5;
const SHARES_PART_INDEX = 3;
const PRICE_PART_INDEX = 4;

const assertOptions = { numRuns: PROPERTY_RUN_COUNT };

describe('trade fingerprint properties', () => {
  it('is deterministic', () => {
    fc.assert(
      fc.property(tradeArbitrary, (trade) => {
        expect(buildTradeFingerprint(trade)).toBe(buildTradeFingerprint({ ...trade }));
      }),
      assertOptions
    );
  });

  it('ignores the case of the ticker, so a re-import is recognised as a duplicate', () => {
    fc.assert(
      fc.property(tradeArbitrary, (trade) => {
        const lowerCased = { ...trade, ticker: trade.ticker.toLowerCase() };

        expect(buildTradeFingerprint(lowerCased)).toBe(buildTradeFingerprint(trade));
      }),
      assertOptions
    );
  });

  it('separates trades that differ in share quantity', () => {
    fc.assert(
      fc.property(tradeArbitrary, sharesArbitrary, (trade, otherShares) => {
        fc.pre(otherShares !== trade.shares);

        expect(buildTradeFingerprint({ ...trade, shares: otherShares })).not.toBe(
          buildTradeFingerprint(trade)
        );
      }),
      assertOptions
    );
  });

  it('separates trades that differ in price', () => {
    fc.assert(
      fc.property(tradeArbitrary, priceArbitrary, (trade, otherPrice) => {
        fc.pre(otherPrice !== trade.pricePerShare);

        expect(buildTradeFingerprint({ ...trade, pricePerShare: otherPrice })).not.toBe(
          buildTradeFingerprint(trade)
        );
      }),
      assertOptions
    );
  });

  it('separates a purchase from a sale of the same quantity on the same day', () => {
    fc.assert(
      fc.property(tradeArbitrary, (trade) => {
        const buy = buildTradeFingerprint({ ...trade, transactionType: 'BUY' });
        const sell = buildTradeFingerprint({ ...trade, transactionType: 'SELL' });

        expect(buy).not.toBe(sell);
      }),
      assertOptions
    );
  });

  it('keeps the quantity and price recoverable from the fingerprint', () => {
    fc.assert(
      fc.property(tradeArbitrary, (trade) => {
        const parts = buildTradeFingerprint(trade).split(FINGERPRINT_SEPARATOR);

        expect(parts).toHaveLength(FINGERPRINT_PART_COUNT);
        expect(Number(parts[SHARES_PART_INDEX])).toBe(trade.shares);
        expect(Number(parts[PRICE_PART_INDEX])).toBe(trade.pricePerShare);
      }),
      assertOptions
    );
  });
});
