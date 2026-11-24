import { pool } from '../../config/db.js';
import {
  addTransaction,
  countPositionsByPortfolioId,
  countTransactionsByPortfolioId,
  deleteAllPortfolioData,
  deletePortfolioAccountById,
  deletePosition,
  deletePositionRowOnly,
  deleteTransactionById,
  deleteTransactionsBySource,
  findOrCreatePortfolioAccount,
  findPortfolioAccountIdByOwnerToken,
  getAllTransactionsForDedup,
  getBuyTransactionsByTicker,
  getInvestmentTotals,
  getPortfolioRebalancingStrategy,
  getPositionById,
  getPositionByTicker,
  getPositionsByPortfolioId,
  getPositionsByPortfolioIdPaginated,
  getTransactionById,
  getTransactionHistory,
  getTransactionsByPortfolioIdPaginated,
  getTransactionsByTicker,
  insertPositionFromLedger,
  listTickersBySource,
  reducePositionShares,
  updatePortfolioPermanentCashInclusion,
  updatePortfolioRebalancingStrategy,
  updatePosition,
  updatePositionSector,
} from '../../repositories/portfolioRepository.js';
import { insertWatchlistItem } from '../../repositories/watchlistRepository.js';
import {
  POSTGRES_ERROR_CODE,
  REBALANCING_STRATEGY,
  TEST_COMPANY_NAME,
  TEST_SECTOR_TECHNOLOGY,
  TEST_USD,
  TRANSACTION_SOURCE,
} from './helpers/dbTestConstants.js';
import {
  buildOwnerToken,
  buildPositionDto,
  captureDatabaseError,
  closeTestDatabasePool,
  createTestPortfolio,
  createTestPosition,
  formatDateColumn,
  truncateAllTables,
} from './helpers/testDatabase.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const FIRST_ENTRY_DATE = '2024-01-15';
const SECOND_ENTRY_DATE = '2025-06-01';
const OLDEST_TRANSACTION_DATE = '2023-03-01';
const MIDDLE_TRANSACTION_DATE = '2024-03-01';
const NEWEST_TRANSACTION_DATE = '2025-03-01';
const HEALTHCARE_SECTOR = 'Healthcare';
const CUSTOM_ALLOCATIONS = { stocks: 70, bonds: 30 };
const UNSUPPORTED_STRATEGY = 'not-a-strategy';
const PORTFOLIO_PAGE_SIZE = 2;
const PORTFOLIO_PAGE_OFFSET = 1;

type TransactionType = 'BUY' | 'SELL';

interface TransactionFixture {
  ticker?: string;
  shares: number;
  pricePerShare: number;
  transactionType: TransactionType;
  transactionDate?: string;
  source?: string;
}

function recordTransaction(portfolioId: string, fixture: TransactionFixture) {
  return addTransaction(portfolioId, {
    ticker: fixture.ticker ?? 'AAPL',
    companyName: TEST_COMPANY_NAME,
    shares: fixture.shares,
    pricePerShare: fixture.pricePerShare,
    currency: TEST_USD,
    transactionDate: fixture.transactionDate,
    transactionType: fixture.transactionType,
    source: fixture.source,
  });
}

async function countRows(tableName: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${tableName}`
  );
  return Number(result.rows[0].count);
}

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('portfolio accounts', () => {
  it('returns the same portfolio for the same owner token and a new one for another token', async () => {
    const first = await findOrCreatePortfolioAccount(buildOwnerToken('alice'));
    const again = await findOrCreatePortfolioAccount(buildOwnerToken('alice'));
    const other = await findOrCreatePortfolioAccount(buildOwnerToken('bob'));

    expect(again).toBe(first);
    expect(other).not.toBe(first);
    expect(await countRows('portfolio_accounts')).toBe(2);
  });

  it('looks a portfolio up by owner token without creating one', async () => {
    const created = await findOrCreatePortfolioAccount(buildOwnerToken('alice'));

    expect(await findPortfolioAccountIdByOwnerToken(buildOwnerToken('alice'))).toBe(created);
    expect(await findPortfolioAccountIdByOwnerToken(buildOwnerToken('nobody'))).toBeNull();
    expect(await countRows('portfolio_accounts')).toBe(1);
  });

  it('deletes the portfolio together with its positions, transactions and watchlist', async () => {
    const portfolioId = await createTestPortfolio('to-delete');
    await createTestPosition(portfolioId);
    await recordTransaction(portfolioId, { shares: 1, pricePerShare: 1, transactionType: 'BUY' });
    await insertWatchlistItem(portfolioId, 'MSFT', 'Microsoft');

    expect(await deletePortfolioAccountById(portfolioId)).toBe(true);

    expect(await countRows('positions')).toBe(0);
    expect(await countRows('transactions')).toBe(0);
    expect(await countRows('watchlist_items')).toBe(0);
    expect(await deletePortfolioAccountById(portfolioId)).toBe(false);
  });
});

describe('upserting positions', () => {
  it('inserts a new position with the supplied cost basis', async () => {
    const portfolioId = await createTestPortfolio('upsert-insert');

    const position = await createTestPosition(portfolioId, {
      shares: 10,
      avgBuyPrice: 100,
      entryDate: FIRST_ENTRY_DATE,
      sector: TEST_SECTOR_TECHNOLOGY,
    });

    expect(Number(position.shares)).toBe(10);
    expect(Number(position.avg_buy_price)).toBe(100);
    expect(formatDateColumn(position.entry_date)).toBe(FIRST_ENTRY_DATE);
    expect(position.sector).toBe(TEST_SECTOR_TECHNOLOGY);
  });

  it('merges a second buy of the same ticker into a weighted average cost', async () => {
    const portfolioId = await createTestPortfolio('upsert-merge');
    await createTestPosition(portfolioId, {
      shares: 10,
      avgBuyPrice: 100,
      entryDate: FIRST_ENTRY_DATE,
    });

    const merged = await createTestPosition(portfolioId, {
      shares: 10,
      avgBuyPrice: 200,
      entryDate: SECOND_ENTRY_DATE,
    });

    expect(Number(merged.shares)).toBe(20);
    expect(Number(merged.avg_buy_price)).toBe(150);
    expect(formatDateColumn(merged.entry_date)).toBe(FIRST_ENTRY_DATE);
    expect(await countPositionsByPortfolioId(portfolioId)).toBe(1);
  });

  it('keeps the existing sector when the new buy has none and replaces it when it has one', async () => {
    const portfolioId = await createTestPortfolio('upsert-sector');
    await createTestPosition(portfolioId, { sector: TEST_SECTOR_TECHNOLOGY });

    const withoutSector = await createTestPosition(portfolioId);
    expect(withoutSector.sector).toBe(TEST_SECTOR_TECHNOLOGY);

    const withSector = await createTestPosition(portfolioId, { sector: HEALTHCARE_SECTOR });
    expect(withSector.sector).toBe(HEALTHCARE_SECTOR);
  });

  it('keeps the same ticker separate in different portfolios', async () => {
    const alice = await createTestPortfolio('alice');
    const bob = await createTestPortfolio('bob');

    await createTestPosition(alice, { shares: 1 });
    await createTestPosition(bob, { shares: 7 });

    expect(Number((await getPositionByTicker(alice, 'AAPL'))?.shares)).toBe(1);
    expect(Number((await getPositionByTicker(bob, 'AAPL'))?.shares)).toBe(7);
  });
});

describe('reading positions', () => {
  it('lists only the portfolio positions in the order they were created', async () => {
    const portfolioId = await createTestPortfolio('list-owner');
    const otherPortfolioId = await createTestPortfolio('list-other');
    await createTestPosition(portfolioId, { ticker: 'AAPL' });
    await createTestPosition(portfolioId, { ticker: 'MSFT' });
    await createTestPosition(otherPortfolioId, { ticker: 'TSLA' });

    const positions = await getPositionsByPortfolioId(portfolioId);

    expect(positions.map((position) => position.ticker)).toEqual(['AAPL', 'MSFT']);
  });

  it('pages through positions with a limit and offset', async () => {
    const portfolioId = await createTestPortfolio('paginate');
    await createTestPosition(portfolioId, { ticker: 'AAPL' });
    await createTestPosition(portfolioId, { ticker: 'MSFT' });
    await createTestPosition(portfolioId, { ticker: 'GOOG' });

    const page = await getPositionsByPortfolioIdPaginated(
      portfolioId,
      PORTFOLIO_PAGE_SIZE,
      PORTFOLIO_PAGE_OFFSET
    );

    expect(page.map((position) => position.ticker)).toEqual(['MSFT', 'GOOG']);
    expect(await countPositionsByPortfolioId(portfolioId)).toBe(3);
  });

  it('finds a position by id only inside its own portfolio', async () => {
    const portfolioId = await createTestPortfolio('by-id-owner');
    const otherPortfolioId = await createTestPortfolio('by-id-other');
    const position = await createTestPosition(portfolioId);

    expect((await getPositionById(position.id, portfolioId))?.ticker).toBe('AAPL');
    expect(await getPositionById(position.id, otherPortfolioId)).toBeNull();
    expect(await getPositionByTicker(portfolioId, 'MSFT')).toBeNull();
  });
});

describe('changing positions', () => {
  it('updates only the supplied fields', async () => {
    const portfolioId = await createTestPortfolio('update-partial');
    const position = await createTestPosition(portfolioId, {
      shares: 10,
      avgBuyPrice: 100,
      entryDate: FIRST_ENTRY_DATE,
    });

    const updated = await updatePosition(position.id, portfolioId, { shares: 12 });

    expect(Number(updated?.shares)).toBe(12);
    expect(Number(updated?.avg_buy_price)).toBe(100);
    expect(formatDateColumn(updated?.entry_date ?? null)).toBe(FIRST_ENTRY_DATE);
  });

  it('updates price, currency and entry date together', async () => {
    const portfolioId = await createTestPortfolio('update-all');
    const position = await createTestPosition(portfolioId);

    const updated = await updatePosition(position.id, portfolioId, {
      avgBuyPrice: 123.45,
      currency: 'EUR',
      entryDate: SECOND_ENTRY_DATE,
    });

    expect(Number(updated?.avg_buy_price)).toBe(123.45);
    expect(updated?.currency).toBe('EUR');
    expect(formatDateColumn(updated?.entry_date ?? null)).toBe(SECOND_ENTRY_DATE);
  });

  it('refuses to update a position that belongs to another portfolio', async () => {
    const owner = await createTestPortfolio('idor-owner');
    const attacker = await createTestPortfolio('idor-attacker');
    const position = await createTestPosition(owner, { shares: 10 });

    const result = await updatePosition(position.id, attacker, { shares: 999 });

    expect(result).toBeNull();
    expect(Number((await getPositionById(position.id, owner))?.shares)).toBe(10);
  });

  it('reduces shares on a partial sell and leaves the cost basis unchanged', async () => {
    const portfolioId = await createTestPortfolio('reduce');
    const position = await createTestPosition(portfolioId, { shares: 10, avgBuyPrice: 100 });

    const reduced = await reducePositionShares(position.id, portfolioId, 4);

    expect(Number(reduced?.shares)).toBe(6);
    expect(Number(reduced?.avg_buy_price)).toBe(100);
  });

  it('refuses to reduce a position of another portfolio', async () => {
    const owner = await createTestPortfolio('reduce-owner');
    const attacker = await createTestPortfolio('reduce-attacker');
    const position = await createTestPosition(owner, { shares: 10 });

    expect(await reducePositionShares(position.id, attacker, 1)).toBeNull();
  });

  it('rejects a sell that would leave zero or negative shares', async () => {
    const portfolioId = await createTestPortfolio('reduce-too-much');
    const position = await createTestPosition(portfolioId, { shares: 10 });

    const sellEverything = await captureDatabaseError(
      reducePositionShares(position.id, portfolioId, 10)
    );
    const sellMoreThanOwned = await captureDatabaseError(
      reducePositionShares(position.id, portfolioId, 11)
    );

    expect(sellEverything.constraint).toBe('positions_shares_positive_check');
    expect(sellMoreThanOwned.constraint).toBe('positions_shares_positive_check');
    expect(Number((await getPositionById(position.id, portfolioId))?.shares)).toBe(10);
  });

  it('backfills the sector only inside the owning portfolio', async () => {
    const owner = await createTestPortfolio('sector-owner');
    const other = await createTestPortfolio('sector-other');
    const position = await createTestPosition(owner);

    await updatePositionSector(position.id, other, HEALTHCARE_SECTOR);
    expect((await getPositionById(position.id, owner))?.sector).toBeNull();

    await updatePositionSector(position.id, owner, HEALTHCARE_SECTOR);
    expect((await getPositionById(position.id, owner))?.sector).toBe(HEALTHCARE_SECTOR);
  });

  it('inserts a ledger position and refuses a duplicate ticker', async () => {
    const portfolioId = await createTestPortfolio('ledger');
    const params = {
      ticker: 'NVDA',
      companyName: 'NVIDIA',
      shares: 3,
      avgBuyPrice: 50,
      currency: TEST_USD,
      entryDate: FIRST_ENTRY_DATE,
    };

    const inserted = await insertPositionFromLedger(portfolioId, params);
    const duplicate = await captureDatabaseError(insertPositionFromLedger(portfolioId, params));

    expect(inserted.sector).toBeNull();
    expect(duplicate.code).toBe(POSTGRES_ERROR_CODE.UNIQUE_VIOLATION);
  });
});

describe('deleting positions', () => {
  it('deletes the position and its BUY history but keeps SELL records and other tickers', async () => {
    const portfolioId = await createTestPortfolio('delete-position');
    const apple = await createTestPosition(portfolioId, { ticker: 'AAPL' });
    await createTestPosition(portfolioId, { ticker: 'MSFT' });
    await recordTransaction(portfolioId, { shares: 5, pricePerShare: 10, transactionType: 'BUY' });
    await recordTransaction(portfolioId, { shares: 5, pricePerShare: 12, transactionType: 'BUY' });
    await recordTransaction(portfolioId, { shares: 2, pricePerShare: 15, transactionType: 'SELL' });
    await recordTransaction(portfolioId, {
      ticker: 'MSFT',
      shares: 1,
      pricePerShare: 20,
      transactionType: 'BUY',
    });

    expect(await deletePosition(apple.id, portfolioId)).toBe(true);

    expect(await getPositionById(apple.id, portfolioId)).toBeNull();
    const remaining = await getTransactionHistory(portfolioId);
    expect(remaining.map((row) => `${row.ticker}:${row.transaction_type}`).sort()).toEqual([
      'AAPL:SELL',
      'MSFT:BUY',
    ]);
  });

  it('leaves everything in place when the position belongs to another portfolio', async () => {
    const owner = await createTestPortfolio('delete-owner');
    const attacker = await createTestPortfolio('delete-attacker');
    const position = await createTestPosition(owner);
    await recordTransaction(owner, { shares: 1, pricePerShare: 1, transactionType: 'BUY' });

    expect(await deletePosition(position.id, attacker)).toBe(false);

    expect(await getPositionById(position.id, owner)).not.toBeNull();
    expect(await countTransactionsByPortfolioId(owner)).toBe(1);
  });

  it('deletes only the position row when asked to, keeping the transactions', async () => {
    const portfolioId = await createTestPortfolio('delete-row-only');
    const position = await createTestPosition(portfolioId);
    await recordTransaction(portfolioId, { shares: 1, pricePerShare: 1, transactionType: 'BUY' });

    expect(await deletePositionRowOnly(position.id, portfolioId)).toBe(true);
    expect(await deletePositionRowOnly(position.id, portfolioId)).toBe(false);
    expect(await countTransactionsByPortfolioId(portfolioId)).toBe(1);
  });
});

describe('transactions', () => {
  it('stores a transaction with the default source when none is given', async () => {
    const portfolioId = await createTestPortfolio('transaction-default');

    const stored = await recordTransaction(portfolioId, {
      shares: 2,
      pricePerShare: 50,
      transactionType: 'BUY',
      transactionDate: MIDDLE_TRANSACTION_DATE,
    });

    expect(stored.source).toBe('unknown');
    expect(formatDateColumn(stored.transaction_date)).toBe(MIDDLE_TRANSACTION_DATE);
    expect((await getTransactionById(stored.id, portfolioId))?.ticker).toBe('AAPL');
  });

  it('does not return a transaction through another portfolio', async () => {
    const owner = await createTestPortfolio('transaction-owner');
    const other = await createTestPortfolio('transaction-other');
    const stored = await recordTransaction(owner, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
    });

    expect(await getTransactionById(stored.id, other)).toBeNull();
  });

  it('orders history oldest first and the paginated list newest first', async () => {
    const portfolioId = await createTestPortfolio('transaction-order');
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      transactionDate: NEWEST_TRANSACTION_DATE,
    });
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      transactionDate: OLDEST_TRANSACTION_DATE,
    });
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      transactionDate: MIDDLE_TRANSACTION_DATE,
    });

    const history = await getTransactionHistory(portfolioId);
    const newestFirst = await getTransactionsByPortfolioIdPaginated(portfolioId, 2, 0);
    const byTicker = await getTransactionsByTicker(portfolioId, 'AAPL');

    expect(history.map((row) => formatDateColumn(row.transaction_date))).toEqual([
      OLDEST_TRANSACTION_DATE,
      MIDDLE_TRANSACTION_DATE,
      NEWEST_TRANSACTION_DATE,
    ]);
    expect(newestFirst.map((row) => formatDateColumn(row.transaction_date))).toEqual([
      NEWEST_TRANSACTION_DATE,
      MIDDLE_TRANSACTION_DATE,
    ]);
    expect(byTicker.map((row) => formatDateColumn(row.transaction_date))).toEqual([
      OLDEST_TRANSACTION_DATE,
      MIDDLE_TRANSACTION_DATE,
      NEWEST_TRANSACTION_DATE,
    ]);
  });

  it('lists only BUY transactions of a ticker, newest first', async () => {
    const portfolioId = await createTestPortfolio('transaction-buys');
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      transactionDate: OLDEST_TRANSACTION_DATE,
    });
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'SELL',
      transactionDate: MIDDLE_TRANSACTION_DATE,
    });
    await recordTransaction(portfolioId, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      transactionDate: NEWEST_TRANSACTION_DATE,
    });

    const buys = await getBuyTransactionsByTicker(portfolioId, 'AAPL');

    expect(buys.map((row) => formatDateColumn(row.transaction_date))).toEqual([
      NEWEST_TRANSACTION_DATE,
      OLDEST_TRANSACTION_DATE,
    ]);
  });

  it('deletes a BUY transaction but never a SELL record or another portfolio row', async () => {
    const owner = await createTestPortfolio('delete-transaction-owner');
    const other = await createTestPortfolio('delete-transaction-other');
    const buy = await recordTransaction(owner, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
    });
    const sell = await recordTransaction(owner, {
      shares: 1,
      pricePerShare: 1,
      transactionType: 'SELL',
    });

    expect(await deleteTransactionById(sell.id, owner)).toBe(false);
    expect(await deleteTransactionById(buy.id, other)).toBe(false);
    expect(await deleteTransactionById(buy.id, owner)).toBe(true);
    expect(await countTransactionsByPortfolioId(owner)).toBe(1);
  });

  it('tracks the ledger source so a source can be listed and removed', async () => {
    const portfolioId = await createTestPortfolio('transaction-source');
    await recordTransaction(portfolioId, {
      ticker: 'AAPL',
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      source: TRANSACTION_SOURCE.IMPORT,
    });
    await recordTransaction(portfolioId, {
      ticker: 'MSFT',
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      source: TRANSACTION_SOURCE.IMPORT,
    });
    await recordTransaction(portfolioId, {
      ticker: 'GOOG',
      shares: 1,
      pricePerShare: 1,
      transactionType: 'BUY',
      source: TRANSACTION_SOURCE.MANUAL,
    });

    expect((await listTickersBySource(portfolioId, TRANSACTION_SOURCE.IMPORT)).sort()).toEqual([
      'AAPL',
      'MSFT',
    ]);
    expect(await getAllTransactionsForDedup(portfolioId)).toHaveLength(3);

    expect(await deleteTransactionsBySource(portfolioId, TRANSACTION_SOURCE.IMPORT)).toBe(2);
    expect(await countTransactionsByPortfolioId(portfolioId)).toBe(1);
  });
});

describe('investment totals', () => {
  it('sums purchases and withdrawals and counts a sell without a purchase as invested', async () => {
    const portfolioId = await createTestPortfolio('totals');
    await recordTransaction(portfolioId, {
      shares: 10,
      pricePerShare: 100,
      transactionType: 'BUY',
    });
    await recordTransaction(portfolioId, { shares: 5, pricePerShare: 200, transactionType: 'BUY' });
    await recordTransaction(portfolioId, {
      shares: 4,
      pricePerShare: 150,
      transactionType: 'SELL',
    });
    await recordTransaction(portfolioId, {
      ticker: 'TSLA',
      shares: 2,
      pricePerShare: 50,
      transactionType: 'SELL',
    });

    const totals = await getInvestmentTotals(portfolioId);

    expect(totals).toEqual({ totalInvested: 2100, totalWithdrawn: 700 });
  });

  it('returns zero totals for an empty portfolio', async () => {
    const portfolioId = await createTestPortfolio('totals-empty');

    expect(await getInvestmentTotals(portfolioId)).toEqual({ totalInvested: 0, totalWithdrawn: 0 });
  });
});

describe('rebalancing strategy', () => {
  it('starts with the default strategy and permanent cash included', async () => {
    const portfolioId = await createTestPortfolio('strategy-default');

    expect(await getPortfolioRebalancingStrategy(portfolioId)).toEqual({
      strategyId: REBALANCING_STRATEGY.DEFAULT,
      customBaseStrategyId: null,
      customAllocations: null,
      includePermanentCash: true,
    });
  });

  it('stores a preset strategy', async () => {
    const portfolioId = await createTestPortfolio('strategy-preset');

    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.BOGLEHEADS,
    });

    expect((await getPortfolioRebalancingStrategy(portfolioId)).strategyId).toBe(
      REBALANCING_STRATEGY.BOGLEHEADS
    );
  });

  it('stores custom allocations together with their base strategy', async () => {
    const portfolioId = await createTestPortfolio('strategy-custom');

    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.CUSTOM,
      customBaseStrategyId: REBALANCING_STRATEGY.BOGLEHEADS,
      customAllocations: CUSTOM_ALLOCATIONS,
    });

    expect(await getPortfolioRebalancingStrategy(portfolioId)).toMatchObject({
      strategyId: REBALANCING_STRATEGY.CUSTOM,
      customBaseStrategyId: REBALANCING_STRATEGY.BOGLEHEADS,
      customAllocations: CUSTOM_ALLOCATIONS,
    });
  });

  it('keeps the saved allocations when switching to custom without new ones', async () => {
    const portfolioId = await createTestPortfolio('strategy-custom-keep');
    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.CUSTOM,
      customAllocations: CUSTOM_ALLOCATIONS,
    });
    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.BOGLEHEADS,
    });

    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.CUSTOM,
    });

    expect(await getPortfolioRebalancingStrategy(portfolioId)).toMatchObject({
      strategyId: REBALANCING_STRATEGY.CUSTOM,
      customAllocations: CUSTOM_ALLOCATIONS,
    });
  });

  it('rejects a strategy that is not on the supported list', async () => {
    const portfolioId = await createTestPortfolio('strategy-invalid');

    const error = await captureDatabaseError(
      updatePortfolioRebalancingStrategy(portfolioId, { strategyId: UNSUPPORTED_STRATEGY })
    );

    expect(error.constraint).toBe('portfolio_accounts_strategy_id_check');
  });

  it('stores the permanent-cash switch', async () => {
    const portfolioId = await createTestPortfolio('strategy-cash');

    await updatePortfolioPermanentCashInclusion(portfolioId, false);

    expect((await getPortfolioRebalancingStrategy(portfolioId)).includePermanentCash).toBe(false);
  });

  it('fails clearly for an unknown portfolio', async () => {
    await expect(getPortfolioRebalancingStrategy(UNKNOWN_ID)).rejects.toThrow(
      'Portfolio account not found'
    );
  });
});

describe('deleting all portfolio data', () => {
  it('removes data, resets the strategy and keeps the account, without touching other portfolios', async () => {
    const portfolioId = await createTestPortfolio('wipe-owner');
    const otherPortfolioId = await createTestPortfolio('wipe-other');
    await createTestPosition(portfolioId, { ticker: 'AAPL' });
    await createTestPosition(portfolioId, { ticker: 'MSFT' });
    await recordTransaction(portfolioId, { shares: 1, pricePerShare: 1, transactionType: 'BUY' });
    await insertWatchlistItem(portfolioId, 'TSLA', 'Tesla');
    await updatePortfolioRebalancingStrategy(portfolioId, {
      strategyId: REBALANCING_STRATEGY.BOGLEHEADS,
    });
    await updatePortfolioPermanentCashInclusion(portfolioId, false);
    await createTestPosition(otherPortfolioId, buildPositionDto());

    const deleted = await deleteAllPortfolioData(portfolioId);

    expect(deleted).toEqual({
      deletedTransactions: 1,
      deletedPositions: 2,
      deletedWatchlistItems: 1,
    });
    expect(await getPortfolioRebalancingStrategy(portfolioId)).toEqual({
      strategyId: REBALANCING_STRATEGY.DEFAULT,
      customBaseStrategyId: null,
      customAllocations: null,
      includePermanentCash: true,
    });
    expect(await countPositionsByPortfolioId(otherPortfolioId)).toBe(1);
    expect(await findPortfolioAccountIdByOwnerToken(buildOwnerToken('wipe-owner'))).toBe(
      portfolioId
    );
  });
});
