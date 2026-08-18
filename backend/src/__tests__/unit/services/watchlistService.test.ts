jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
}));

jest.mock('../../../repositories/watchlistRepository.js', () => ({
  getWatchlistByPortfolioId: jest.fn(),
  countWatchlistByPortfolioId: jest.fn(),
  insertWatchlistItem: jest.fn(),
  deleteWatchlistItem: jest.fn(),
  getWatchlistItemByTicker: jest.fn(),
}));

import { MAX_WATCHLIST_ITEMS } from '../../../constants.js';
import { findOrCreatePortfolioAccount } from '../../../repositories/portfolioRepository.js';
import {
  countWatchlistByPortfolioId,
  deleteWatchlistItem,
  getWatchlistByPortfolioId,
  getWatchlistItemByTicker,
  insertWatchlistItem,
} from '../../../repositories/watchlistRepository.js';
import {
  addWatchlistItem,
  getUserWatchlist,
  removeWatchlistItem,
} from '../../../services/watchlistService.js';
import type { WatchlistItemRow } from '../../../types/watchlist.types.js';

const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetWatchlist = getWatchlistByPortfolioId as jest.MockedFunction<
  typeof getWatchlistByPortfolioId
>;
const mockedGetByTicker = getWatchlistItemByTicker as jest.MockedFunction<
  typeof getWatchlistItemByTicker
>;
const mockedCount = countWatchlistByPortfolioId as jest.MockedFunction<
  typeof countWatchlistByPortfolioId
>;
const mockedInsert = insertWatchlistItem as jest.MockedFunction<typeof insertWatchlistItem>;
const mockedDelete = deleteWatchlistItem as jest.MockedFunction<typeof deleteWatchlistItem>;

const USER_ID = '11111111-1111-1111-1111-111111111111';
const PORTFOLIO_ID = 'portfolio-1';

function watchlistRow(overrides: Partial<WatchlistItemRow> = {}): WatchlistItemRow {
  return {
    id: 'wl-1',
    portfolio_id: PORTFOLIO_ID,
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    created_at: new Date('2026-01-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('watchlistService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOrCreate.mockResolvedValue(PORTFOLIO_ID);
  });

  it('maps watchlist rows for the HMAC portfolio', async () => {
    mockedGetWatchlist.mockResolvedValue([watchlistRow()]);

    await expect(getUserWatchlist(USER_ID)).resolves.toEqual([
      {
        id: 'wl-1',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        createdAt: '2026-01-15T00:00:00.000Z',
      },
    ]);
  });

  it('rejects an invalid ticker before touching the database', async () => {
    await expect(
      addWatchlistItem(USER_ID, { ticker: 'not a ticker!!!', companyName: 'Apple' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedFindOrCreate).not.toHaveBeenCalled();
  });

  it('rejects a duplicate ticker', async () => {
    mockedGetByTicker.mockResolvedValue(watchlistRow());

    await expect(
      addWatchlistItem(USER_ID, { ticker: 'aapl', companyName: 'Apple Inc.' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects adding past the watchlist cap', async () => {
    mockedGetByTicker.mockResolvedValue(null);
    mockedCount.mockResolvedValue(MAX_WATCHLIST_ITEMS);

    await expect(
      addWatchlistItem(USER_ID, { ticker: 'MSFT', companyName: 'Microsoft' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockedInsert).not.toHaveBeenCalled();
  });

  it('inserts a new watchlist item', async () => {
    mockedGetByTicker.mockResolvedValue(null);
    mockedCount.mockResolvedValue(0);
    mockedInsert.mockResolvedValue(watchlistRow({ ticker: 'MSFT', company_name: 'Microsoft' }));

    const created = await addWatchlistItem(USER_ID, { ticker: 'msft', companyName: 'Microsoft' });

    expect(mockedInsert).toHaveBeenCalledWith(PORTFOLIO_ID, 'MSFT', 'Microsoft');
    expect(created.ticker).toBe('MSFT');
  });

  it('throws 404 when removing a missing item', async () => {
    mockedDelete.mockResolvedValue(false);

    await expect(removeWatchlistItem(USER_ID, 'wl-missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes through the HMAC portfolio id', async () => {
    mockedDelete.mockResolvedValue(true);

    await removeWatchlistItem(USER_ID, 'wl-1');

    expect(mockedDelete).toHaveBeenCalledWith('wl-1', PORTFOLIO_ID);
  });
});
