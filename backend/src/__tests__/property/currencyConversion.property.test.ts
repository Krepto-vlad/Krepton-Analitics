import fc from 'fast-check';
import {
  computeNativeInvestmentTotals,
  convertWithRate,
  roundMoney,
} from '../../services/currencyConversionService.js';
import type { TransactionRow } from '../../types/portfolio.types.js';
import {
  CENTS_PER_UNIT,
  MAX_CONVERTIBLE_AMOUNT,
  MAX_FX_RATE,
  MIN_FX_RATE,
  MONEY_ROUNDING_TOLERANCE,
  PROPERTY_RUN_COUNT,
} from './propertyConstants.js';
import {
  isoDateArbitrary,
  priceArbitrary,
  sharesArbitrary,
  validTickerArbitrary,
} from './arbitraries.js';

const MAX_TRANSACTIONS = 12;
const TEST_PORTFOLIO_ID = '00000000-0000-4000-8000-000000000001';
const TEST_TRANSACTION_ID = '00000000-0000-4000-8000-000000000002';
const NUMERIC_DECIMALS = 8;

const assertOptions = { numRuns: PROPERTY_RUN_COUNT };

const amountArbitrary = fc.double({
  min: -MAX_CONVERTIBLE_AMOUNT,
  max: MAX_CONVERTIBLE_AMOUNT,
  noNaN: true,
  noDefaultInfinity: true,
});

const nonNegativeAmountArbitrary = fc.double({
  min: 0,
  max: MAX_CONVERTIBLE_AMOUNT,
  noNaN: true,
  noDefaultInfinity: true,
});

const rateArbitrary = fc.double({
  min: MIN_FX_RATE,
  max: MAX_FX_RATE,
  noNaN: true,
  noDefaultInfinity: true,
});

interface TransactionInput {
  ticker: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  pricePerShare: number;
  transactionDate: string;
}

const transactionInputArbitrary: fc.Arbitrary<TransactionInput> = fc.record({
  ticker: fc.constantFrom('AAPL', 'MSFT', 'TSLA', 'VOO'),
  transactionType: fc.constantFrom('BUY' as const, 'SELL' as const),
  shares: sharesArbitrary,
  pricePerShare: priceArbitrary,
  transactionDate: isoDateArbitrary,
});

function toTransactionRow(input: TransactionInput): TransactionRow {
  return {
    id: TEST_TRANSACTION_ID,
    portfolio_id: TEST_PORTFOLIO_ID,
    ticker: input.ticker,
    company_name: input.ticker,
    shares: input.shares.toFixed(NUMERIC_DECIMALS),
    price_per_share: input.pricePerShare.toFixed(NUMERIC_DECIMALS),
    currency: 'USD',
    transaction_date: input.transactionDate,
    transaction_type: input.transactionType,
    created_at: new Date(0),
  };
}

const transactionsArbitrary = fc.array(transactionInputArbitrary, { maxLength: MAX_TRANSACTIONS });

describe('money rounding properties', () => {
  it('stays within half a cent of the input', () => {
    fc.assert(
      fc.property(amountArbitrary, (amount) => {
        expect(Math.abs(roundMoney(amount) - amount)).toBeLessThanOrEqual(MONEY_ROUNDING_TOLERANCE);
      }),
      assertOptions
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(amountArbitrary, (amount) => {
        expect(roundMoney(roundMoney(amount))).toBe(roundMoney(amount));
      }),
      assertOptions
    );
  });

  it('leaves an amount that is already whole cents unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({
          min: -MAX_CONVERTIBLE_AMOUNT * CENTS_PER_UNIT,
          max: MAX_CONVERTIBLE_AMOUNT * CENTS_PER_UNIT,
        }),
        (cents) => {
          const amount = cents / CENTS_PER_UNIT;

          expect(roundMoney(amount)).toBe(amount);
        }
      ),
      assertOptions
    );
  });
});

describe('currency conversion properties', () => {
  it('converting at a rate of one only rounds', () => {
    fc.assert(
      fc.property(amountArbitrary, (amount) => {
        expect(convertWithRate(amount, 1)).toBe(roundMoney(amount));
      }),
      assertOptions
    );
  });

  it('never turns a non-negative amount negative', () => {
    fc.assert(
      fc.property(nonNegativeAmountArbitrary, rateArbitrary, (amount, rate) => {
        expect(convertWithRate(amount, rate)).toBeGreaterThanOrEqual(0);
      }),
      assertOptions
    );
  });

  it('converts zero to zero at any rate', () => {
    fc.assert(
      fc.property(rateArbitrary, (rate) => {
        expect(convertWithRate(0, rate)).toBe(0);
      }),
      assertOptions
    );
  });

  it('never reverses the order of two amounts', () => {
    fc.assert(
      fc.property(
        nonNegativeAmountArbitrary,
        nonNegativeAmountArbitrary,
        rateArbitrary,
        (a, b, rate) => {
          const smaller = Math.min(a, b);
          const larger = Math.max(a, b);

          expect(convertWithRate(smaller, rate)).toBeLessThanOrEqual(convertWithRate(larger, rate));
        }
      ),
      assertOptions
    );
  });
});

describe('native investment totals properties', () => {
  it('does not depend on the order of the transactions', () => {
    fc.assert(
      fc.property(transactionsArbitrary, (inputs) => {
        const rows = inputs.map(toTransactionRow);

        expect(computeNativeInvestmentTotals([...rows].reverse())).toEqual(
          computeNativeInvestmentTotals(rows)
        );
      }),
      assertOptions
    );
  });

  it('never reports a negative total', () => {
    fc.assert(
      fc.property(transactionsArbitrary, (inputs) => {
        const totals = computeNativeInvestmentTotals(inputs.map(toTransactionRow));

        expect(totals.totalInvested).toBeGreaterThanOrEqual(0);
        expect(totals.totalWithdrawn).toBeGreaterThanOrEqual(0);
      }),
      assertOptions
    );
  });

  it('withdraws nothing when there are only purchases', () => {
    fc.assert(
      fc.property(transactionsArbitrary, (inputs) => {
        const purchases = inputs
          .map((input) => ({ ...input, transactionType: 'BUY' as const }))
          .map(toTransactionRow);

        expect(computeNativeInvestmentTotals(purchases).totalWithdrawn).toBe(0);
      }),
      assertOptions
    );
  });

  it('counts every sale as withdrawn money', () => {
    fc.assert(
      fc.property(transactionsArbitrary, (inputs) => {
        const sellsOnly = inputs.filter((input) => input.transactionType === 'SELL');
        const expectedWithdrawn = roundMoney(
          sellsOnly.reduce((sum, sell) => sum + sell.shares * sell.pricePerShare, 0)
        );

        const totals = computeNativeInvestmentTotals(inputs.map(toTransactionRow));

        expect(totals.totalWithdrawn).toBe(expectedWithdrawn);
      }),
      assertOptions
    );
  });

  it('treats a sale of a ticker with a purchase as withdrawn only, not as new investment', () => {
    fc.assert(
      fc.property(
        validTickerArbitrary,
        sharesArbitrary,
        priceArbitrary,
        sharesArbitrary,
        priceArbitrary,
        isoDateArbitrary,
        (ticker, buyShares, buyPrice, sellShares, sellPrice, transactionDate) => {
          const buy = toTransactionRow({
            ticker,
            transactionType: 'BUY',
            shares: buyShares,
            pricePerShare: buyPrice,
            transactionDate,
          });
          const sell = toTransactionRow({
            ticker,
            transactionType: 'SELL',
            shares: sellShares,
            pricePerShare: sellPrice,
            transactionDate,
          });

          const withSale = computeNativeInvestmentTotals([buy, sell]);
          const purchaseOnly = computeNativeInvestmentTotals([buy]);

          expect(withSale.totalInvested).toBe(purchaseOnly.totalInvested);
        }
      ),
      assertOptions
    );
  });
});
