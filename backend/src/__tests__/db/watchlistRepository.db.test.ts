import { checkDatabaseConnection } from '../../config/db.js';
import {
  countWatchlistByPortfolioId,
  deleteWatchlistItem,
  getWatchlistByPortfolioId,
  getWatchlistItemByTicker,
  insertWatchlistItem,
} from '../../repositories/watchlistRepository.js';
import { POSTGRES_ERROR_CODE } from './helpers/dbTestConstants.js';
import {
  captureDatabaseError,
  closeTestDatabasePool,
  createTestPortfolio,
  truncateAllTables,
} from './helpers/testDatabase.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const MALFORMED_TICKER = 'bad ticker';
const BLANK_COMPANY_NAME = '   ';

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closeTestDatabasePool();
});

describe('watchlistRepository on PostgreSQL', () => {
  it('stores items and lists them in the order they were added', async () => {
    const portfolioId = await createTestPortfolio('watchlist-order');

    await insertWatchlistItem(portfolioId, 'MSFT', 'Microsoft');
    await insertWatchlistItem(portfolioId, 'AAPL', 'Apple');

    const items = await getWatchlistByPortfolioId(portfolioId);
    expect(items.map((item) => item.ticker)).toEqual(['MSFT', 'AAPL']);
    expect(items[0].company_name).toBe('Microsoft');
    expect(await countWatchlistByPortfolioId(portfolioId)).toBe(2);
  });

  it('keeps each portfolio watchlist separate', async () => {
    const alice = await createTestPortfolio('watchlist-alice');
    const bob = await createTestPortfolio('watchlist-bob');
    await insertWatchlistItem(alice, 'AAPL', 'Apple');
    await insertWatchlistItem(bob, 'AAPL', 'Apple');
    await insertWatchlistItem(bob, 'MSFT', 'Microsoft');

    expect(await countWatchlistByPortfolioId(alice)).toBe(1);
    expect(await countWatchlistByPortfolioId(bob)).toBe(2);
  });

  it('finds an item by ticker inside its own portfolio only', async () => {
    const owner = await createTestPortfolio('watchlist-find-owner');
    const other = await createTestPortfolio('watchlist-find-other');
    await insertWatchlistItem(owner, 'AAPL', 'Apple');

    expect((await getWatchlistItemByTicker(owner, 'AAPL'))?.company_name).toBe('Apple');
    expect(await getWatchlistItemByTicker(other, 'AAPL')).toBeNull();
    expect(await getWatchlistItemByTicker(owner, 'MSFT')).toBeNull();
  });

  it('rejects the same ticker twice in one watchlist', async () => {
    const portfolioId = await createTestPortfolio('watchlist-duplicate');
    await insertWatchlistItem(portfolioId, 'AAPL', 'Apple');

    const error = await captureDatabaseError(insertWatchlistItem(portfolioId, 'AAPL', 'Apple'));

    expect(error).toEqual({
      code: POSTGRES_ERROR_CODE.UNIQUE_VIOLATION,
      constraint: 'watchlist_items_portfolio_ticker_unique',
    });
  });

  it('rejects an item for a portfolio that does not exist', async () => {
    const error = await captureDatabaseError(insertWatchlistItem(UNKNOWN_ID, 'AAPL', 'Apple'));

    expect(error.code).toBe(POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION);
  });

  it('rejects a malformed ticker and a blank company name', async () => {
    const portfolioId = await createTestPortfolio('watchlist-quality');

    const badTicker = await captureDatabaseError(
      insertWatchlistItem(portfolioId, MALFORMED_TICKER, 'Apple')
    );
    const blankName = await captureDatabaseError(
      insertWatchlistItem(portfolioId, 'AAPL', BLANK_COMPANY_NAME)
    );

    expect(badTicker.constraint).toBe('watchlist_items_ticker_format_check');
    expect(blankName.constraint).toBe('watchlist_items_company_name_not_blank_check');
  });

  it('deletes an item only through its own portfolio', async () => {
    const owner = await createTestPortfolio('watchlist-delete-owner');
    const attacker = await createTestPortfolio('watchlist-delete-attacker');
    const item = await insertWatchlistItem(owner, 'AAPL', 'Apple');

    expect(await deleteWatchlistItem(item.id, attacker)).toBe(false);
    expect(await countWatchlistByPortfolioId(owner)).toBe(1);

    expect(await deleteWatchlistItem(item.id, owner)).toBe(true);
    expect(await deleteWatchlistItem(item.id, owner)).toBe(false);
    expect(await countWatchlistByPortfolioId(owner)).toBe(0);
  });
});

describe('database connection', () => {
  it('confirms the pool can reach the database', async () => {
    await expect(checkDatabaseConnection()).resolves.toBeUndefined();
  });
});
