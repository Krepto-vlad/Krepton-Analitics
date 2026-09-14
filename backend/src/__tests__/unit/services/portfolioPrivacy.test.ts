jest.mock('../../../services/snaptradeConnectionsService.js', () => ({
  listBrokerSyncConnectionsForExport: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../services/authService.js', () => ({
  getUserById: jest.fn(),
  verifySensitiveAction: jest.fn(),
}));

jest.mock('../../../repositories/watchlistRepository.js', () => ({
  getWatchlistByPortfolioId: jest.fn(),
}));

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getPositionsByPortfolioId: jest.fn(),
  getPositionsByPortfolioIdPaginated: jest.fn(),
  countPositionsByPortfolioId: jest.fn(),
  getTransactionsByPortfolioIdPaginated: jest.fn(),
  countTransactionsByPortfolioId: jest.fn(),
  upsertPosition: jest.fn(),
  addTransaction: jest.fn(),
  getPositionById: jest.fn(),
  getPositionByTicker: jest.fn(),
  reducePositionShares: jest.fn(),
  updatePosition: jest.fn(),
  deletePosition: jest.fn(),
  deletePositionRowOnly: jest.fn(),
  getTransactionById: jest.fn(),
  getTransactionsByTicker: jest.fn(),
  getBuyTransactionsByTicker: jest.fn(),
  deleteTransactionById: jest.fn(),
  updatePositionSector: jest.fn(),
  getAllTransactionsForDedup: jest.fn(),
  insertPositionFromLedger: jest.fn(),
  getPortfolioRebalancingStrategy: jest.fn(),
  updatePortfolioRebalancingStrategy: jest.fn(),
  deleteAllPortfolioData: jest.fn(),
  getTransactionHistory: jest.fn(),
}));

import {
  PORTFOLIO_DATA_DELETE_CONFIRMATION,
  PORTFOLIO_EXPORT_SCHEMA_VERSION,
} from '../../../constants.js';
import {
  deleteAllPortfolioData,
  findOrCreatePortfolioAccount,
  getPortfolioRebalancingStrategy,
  getPositionsByPortfolioId,
  getTransactionHistory,
} from '../../../repositories/portfolioRepository.js';
import { getWatchlistByPortfolioId } from '../../../repositories/watchlistRepository.js';
import { getUserById, verifySensitiveAction } from '../../../services/authService.js';
import { createFreeSubscriptionSummary } from '../../../types/billing.types.js';
import {
  deleteUserPortfolioData,
  exportUserPortfolioData,
} from '../../../services/portfolioService.js';
import type { PositionRow, TransactionRow } from '../../../types/portfolio.types.js';
import type { WatchlistItemRow } from '../../../types/watchlist.types.js';

const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedDeleteAll = deleteAllPortfolioData as jest.MockedFunction<
  typeof deleteAllPortfolioData
>;
const mockedVerify = verifySensitiveAction as jest.MockedFunction<typeof verifySensitiveAction>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;
const mockedGetTxHistory = getTransactionHistory as jest.MockedFunction<
  typeof getTransactionHistory
>;
const mockedGetWatchlist = getWatchlistByPortfolioId as jest.MockedFunction<
  typeof getWatchlistByPortfolioId
>;
const mockedGetStrategy = getPortfolioRebalancingStrategy as jest.MockedFunction<
  typeof getPortfolioRebalancingStrategy
>;

const USER_ID = '11111111-1111-1111-1111-111111111111';
const PORTFOLIO_ID = 'portfolio-1';

const positionRow: PositionRow = {
  id: 'pos-1',
  portfolio_id: PORTFOLIO_ID,
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  shares: '10',
  avg_buy_price: '100',
  currency: 'USD',
  sector: 'Technology',
  entry_date: '2026-01-15',
  created_at: new Date('2026-01-15T00:00:00.000Z'),
  updated_at: new Date('2026-01-15T00:00:00.000Z'),
};

const transactionRow: TransactionRow = {
  id: 'tx-1',
  portfolio_id: PORTFOLIO_ID,
  ticker: 'AAPL',
  company_name: 'Apple Inc.',
  shares: '10',
  price_per_share: '100',
  currency: 'USD',
  transaction_date: '2026-01-15',
  transaction_type: 'BUY',
  created_at: new Date('2026-01-15T00:00:00.000Z'),
};

const watchlistRow: WatchlistItemRow = {
  id: 'wl-1',
  portfolio_id: PORTFOLIO_ID,
  ticker: 'MSFT',
  company_name: 'Microsoft',
  created_at: new Date('2026-01-15T00:00:00.000Z'),
};

describe('portfolioService privacy actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOrCreate.mockResolvedValue(PORTFOLIO_ID);
  });

  describe('deleteUserPortfolioData', () => {
    it('rejects a missing confirmation token', async () => {
      await expect(deleteUserPortfolioData(USER_ID, 'nope')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(mockedDeleteAll).not.toHaveBeenCalled();
    });

    it('wipes the HMAC-scoped portfolio after confirmation', async () => {
      mockedDeleteAll.mockResolvedValue({
        deletedTransactions: 2,
        deletedPositions: 1,
        deletedWatchlistItems: 3,
      });

      await expect(
        deleteUserPortfolioData(USER_ID, PORTFOLIO_DATA_DELETE_CONFIRMATION)
      ).resolves.toEqual({
        deletedTransactions: 2,
        deletedPositions: 1,
        deletedWatchlistItems: 3,
      });
      expect(mockedDeleteAll).toHaveBeenCalledWith(PORTFOLIO_ID);
    });
  });

  describe('exportUserPortfolioData', () => {
    it('assembles a snapshot after step-up authentication', async () => {
      mockedVerify.mockResolvedValue(undefined);
      mockedGetUser.mockResolvedValue({
        id: USER_ID,
        email: 'user@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: false,
        isAdmin: false,
        subscription: createFreeSubscriptionSummary(),
      });
      mockedGetPositions.mockResolvedValue([positionRow]);
      mockedGetTxHistory.mockResolvedValue([transactionRow]);
      mockedGetWatchlist.mockResolvedValue([watchlistRow]);
      mockedGetStrategy.mockResolvedValue({
        strategyId: 'warren-buffett-9010',
        customBaseStrategyId: null,
        customAllocations: null,
      });

      const exported = await exportUserPortfolioData(USER_ID, { password: 'secret' });

      expect(mockedVerify).toHaveBeenCalledWith(USER_ID, { password: 'secret' });
      expect(exported.schemaVersion).toBe(PORTFOLIO_EXPORT_SCHEMA_VERSION);
      expect(exported.account.email).toBe('user@example.com');
      expect(exported.positions).toHaveLength(1);
      expect(exported.transactions).toHaveLength(1);
      expect(exported.watchlist).toEqual([
        expect.objectContaining({ ticker: 'MSFT', companyName: 'Microsoft' }),
      ]);
      expect(exported.rebalancing.strategyId).toBe('warren-buffett-9010');
      expect(exported.transactions[0]?.source).toBe('unknown');
      expect(exported.brokerageConnections).toEqual([]);
    });
  });
});
