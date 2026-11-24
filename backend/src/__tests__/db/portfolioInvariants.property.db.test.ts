import fc from 'fast-check';
import {
  computeNativeInvestmentTotals,
  roundMoney,
} from '../../services/currencyConversionService.js';
import {
  addTransaction,
  getInvestmentTotals,
  getPositionByTicker,
  getTransactionHistory,
  upsertPosition,
} from '../../repositories/portfolioRepository.js';
import { priceArbitrary } from '../property/arbitraries.js';
import { DATABASE_PROPERTY_RUN_COUNT } from '../property/propertyConstants.js';
import { TEST_COMPANY_NAME, TEST_USD } from './helpers/dbTestConstants.js';
import {
  closeTestDatabasePool,
  createTestPortfolio,
  truncateAllTables,
} from './helpers/testDatabase.js';

const MAX_WHOLE_SHARES = 1_000;
const MAX_TRANSACTIONS = 10;
const MAX_BUYS_PER_POSITION = 6;
const AVERAGE_PRICE_PRECISION_DIGITS = 6;
const TICKERS = ['AAPL', 'MSFT', 'TSLA', 'VOO'] as const;

const assertOptions = { numRuns: DATABASE_PROPERTY_RUN_COUNT };

/** Whole shares keep every trade value a multiple of one cent, so rounding is unambiguous. */
const wholeSharesArbitrary = fc.integer({ min: 1, max: MAX_WHOLE_SHARES });

const ledgerTransactionArbitrary = fc.record({
  ticker: fc.constantFrom(...TICKERS),
  transactionType: fc.constantFrom('BUY' as const, 'SELL' as const),
  shares: wholeSharesArbitrary,
  pricePerShare: priceArbitrary,
});

const buyArbitrary = fc.record({
  shares: wholeSharesArbitrary,
  pricePerShare: priceArbitrary,
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('portfolio invariants over random ledgers (PostgreSQL)', () => {
  it('SQL investment totals equal the totals computed in TypeScript', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(ledgerTransactionArbitrary, { minLength: 1, maxLength: MAX_TRANSACTIONS }),
        async (ledger) => {
          await truncateAllTables();
          const portfolioId = await createTestPortfolio('totals-differential');

          for (const entry of ledger) {
            await addTransaction(portfolioId, {
              ticker: entry.ticker,
              companyName: TEST_COMPANY_NAME,
              shares: entry.shares,
              pricePerShare: entry.pricePerShare,
              currency: TEST_USD,
              transactionType: entry.transactionType,
            });
          }

          const fromSql = await getInvestmentTotals(portfolioId);
          const fromTypeScript = computeNativeInvestmentTotals(
            await getTransactionHistory(portfolioId)
          );

          expect(roundMoney(fromSql.totalInvested)).toBe(fromTypeScript.totalInvested);
          expect(roundMoney(fromSql.totalWithdrawn)).toBe(fromTypeScript.totalWithdrawn);
        }
      ),
      assertOptions
    );
  });

  it('repeated buys merge into the share-weighted average cost', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(buyArbitrary, { minLength: 1, maxLength: MAX_BUYS_PER_POSITION }),
        async (buys) => {
          await truncateAllTables();
          const portfolioId = await createTestPortfolio('average-cost');

          for (const buy of buys) {
            await upsertPosition(portfolioId, {
              ticker: 'AAPL',
              companyName: TEST_COMPANY_NAME,
              shares: buy.shares,
              avgBuyPrice: buy.pricePerShare,
              currency: TEST_USD,
            });
          }

          const totalShares = buys.reduce((sum, buy) => sum + buy.shares, 0);
          const totalCost = buys.reduce((sum, buy) => sum + buy.shares * buy.pricePerShare, 0);
          const position = await getPositionByTicker(portfolioId, 'AAPL');

          expect(Number(position?.shares)).toBe(totalShares);
          expect(Number(position?.avg_buy_price)).toBeCloseTo(
            totalCost / totalShares,
            AVERAGE_PRICE_PRECISION_DIGITS
          );
        }
      ),
      assertOptions
    );
  });
});
