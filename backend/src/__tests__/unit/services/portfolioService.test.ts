jest.mock('../../../services/stockService.js', () => ({
  getStockSector: jest.fn(),
  getStockHistory: jest.fn(),
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

import { getStockSector } from '../../../services/stockService.js';
import {
  addTransaction,
  deletePosition,
  deletePositionRowOnly,
  findOrCreatePortfolioAccount,
  getAllTransactionsForDedup,
  getPositionById,
  getPositionsByPortfolioId,
  reducePositionShares,
  updatePosition,
  upsertPosition,
} from '../../../repositories/portfolioRepository.js';
import {
  closePosition,
  createPosition,
  editPosition,
  getInvestmentSummary,
  getUserPositions,
  removePosition,
} from '../../../services/portfolioService.js';
import type { PositionRow, TransactionRow } from '../../../types/portfolio.types.js';

const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetStockSector = getStockSector as jest.MockedFunction<typeof getStockSector>;
const mockedAddTransaction = addTransaction as jest.MockedFunction<typeof addTransaction>;
const mockedUpsert = upsertPosition as jest.MockedFunction<typeof upsertPosition>;
const mockedDeletePosition = deletePosition as jest.MockedFunction<typeof deletePosition>;
const mockedGetPositions = getPositionsByPortfolioId as jest.MockedFunction<
  typeof getPositionsByPortfolioId
>;
const mockedGetAllTx = getAllTransactionsForDedup as jest.MockedFunction<
  typeof getAllTransactionsForDedup
>;
const mockedUpdatePosition = updatePosition as jest.MockedFunction<typeof updatePosition>;
const mockedGetPositionById = getPositionById as jest.MockedFunction<typeof getPositionById>;
const mockedDeleteRowOnly = deletePositionRowOnly as jest.MockedFunction<
  typeof deletePositionRowOnly
>;
const mockedReduceShares = reducePositionShares as jest.MockedFunction<typeof reducePositionShares>;

const USER_ID = '11111111-1111-1111-1111-111111111111';
const PORTFOLIO_ID = 'portfolio-1';

function buildPositionRow(overrides: Partial<PositionRow> = {}): PositionRow {
  return {
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
    ...overrides,
  };
}

function buildTransactionRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
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
    ...overrides,
  };
}

const validAddDto = {
  ticker: 'aapl',
  companyName: 'Apple Inc.',
  shares: 10,
  avgBuyPrice: 150,
  currency: 'USD' as const,
  entryDate: '2026-01-15',
};

describe('portfolioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOrCreate.mockResolvedValue(PORTFOLIO_ID);
    mockedGetStockSector.mockResolvedValue({
      sector: 'Technology',
      industry: 'Consumer Electronics',
    });
    mockedAddTransaction.mockResolvedValue(buildTransactionRow());
    mockedUpsert.mockResolvedValue(buildPositionRow());
  });

  describe('createPosition', () => {
    it('rejects an invalid ticker before touching the database', async () => {
      await expect(
        createPosition(USER_ID, { ...validAddDto, ticker: 'not a ticker!!!' })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockedFindOrCreate).not.toHaveBeenCalled();
    });

    it('rejects non-positive shares', async () => {
      await expect(createPosition(USER_ID, { ...validAddDto, shares: 0 })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('records a BUY and upserts the aggregated position', async () => {
      const created = await createPosition(USER_ID, { ...validAddDto });

      expect(mockedGetStockSector).toHaveBeenCalledWith('AAPL');
      expect(mockedAddTransaction).toHaveBeenCalledWith(
        PORTFOLIO_ID,
        expect.objectContaining({
          ticker: 'AAPL',
          shares: 10,
          pricePerShare: 150,
          transactionType: 'BUY',
        })
      );
      expect(mockedUpsert).toHaveBeenCalledWith(
        PORTFOLIO_ID,
        expect.objectContaining({ ticker: 'AAPL', sector: 'Technology' })
      );
      expect(created).toEqual(
        expect.objectContaining({
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 10,
          avgBuyPrice: 100,
        })
      );
    });

    it('does not call Yahoo when the client already sent a real sector', async () => {
      await createPosition(USER_ID, { ...validAddDto, sector: 'Healthcare' });

      expect(mockedGetStockSector).not.toHaveBeenCalled();
    });
  });

  describe('editPosition', () => {
    it('rejects an empty patch', async () => {
      await expect(editPosition(USER_ID, 'pos-1', {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when the row is missing', async () => {
      mockedUpdatePosition.mockResolvedValue(null);

      await expect(editPosition(USER_ID, 'pos-missing', { shares: 5 })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns the updated position', async () => {
      mockedUpdatePosition.mockResolvedValue(buildPositionRow({ shares: '5' }));

      const updated = await editPosition(USER_ID, 'pos-1', { shares: 5 });

      expect(updated.shares).toBe(5);
    });
  });

  describe('removePosition', () => {
    it('throws 404 when delete affects no row', async () => {
      mockedDeletePosition.mockResolvedValue(false);

      await expect(removePosition(USER_ID, 'pos-missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('deletes through the HMAC portfolio id', async () => {
      mockedDeletePosition.mockResolvedValue(true);

      await removePosition(USER_ID, 'pos-1');

      expect(mockedFindOrCreate).toHaveBeenCalledTimes(1);
      expect(mockedDeletePosition).toHaveBeenCalledWith('pos-1', PORTFOLIO_ID);
    });
  });

  describe('closePosition', () => {
    it('rejects selling more shares than held', async () => {
      mockedGetPositionById.mockResolvedValue(buildPositionRow({ shares: '2' }));

      await expect(
        closePosition(USER_ID, 'pos-1', {
          shares: 10,
          pricePerShare: 200,
          currency: 'USD',
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/only 2 held/) });
    });

    it('writes a SELL and removes the row on a full close', async () => {
      mockedGetPositionById.mockResolvedValue(buildPositionRow({ shares: '10' }));
      mockedDeleteRowOnly.mockResolvedValue(true);

      const result = await closePosition(USER_ID, 'pos-1', {
        shares: 10,
        pricePerShare: 200,
        currency: 'USD',
        saleDate: '2026-03-01',
      });

      expect(result).toBeNull();
      expect(mockedAddTransaction).toHaveBeenCalledWith(
        PORTFOLIO_ID,
        expect.objectContaining({ transactionType: 'SELL', shares: 10 })
      );
      expect(mockedDeleteRowOnly).toHaveBeenCalledWith('pos-1', PORTFOLIO_ID);
    });

    it('reduces shares on a partial close', async () => {
      mockedGetPositionById.mockResolvedValue(buildPositionRow({ shares: '10' }));
      mockedReduceShares.mockResolvedValue(buildPositionRow({ shares: '4' }));

      const result = await closePosition(USER_ID, 'pos-1', {
        shares: 6,
        pricePerShare: 200,
        currency: 'USD',
      });

      expect(result?.shares).toBe(4);
      expect(mockedReduceShares).toHaveBeenCalledWith('pos-1', PORTFOLIO_ID, 6);
    });
  });

  describe('getUserPositions', () => {
    it('maps rows and copies display fields when currency already matches', async () => {
      mockedGetPositions.mockResolvedValue([buildPositionRow()]);

      const positions = await getUserPositions(USER_ID, 'USD');

      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual(
        expect.objectContaining({
          ticker: 'AAPL',
          shares: 10,
          displayCurrency: 'USD',
          displayAvgBuyPrice: 100,
          displayFxRate: 1,
        })
      );
    });
  });

  describe('getInvestmentSummary', () => {
    it('sums BUY notionals in native and display currency', async () => {
      mockedGetAllTx.mockResolvedValue([
        buildTransactionRow(),
        buildTransactionRow({
          id: 'tx-2',
          transaction_type: 'SELL',
          shares: '2',
          price_per_share: '120',
        }),
      ]);

      const summary = await getInvestmentSummary(USER_ID, 'USD');

      expect(summary.totalInvested).toBe(1000);
      expect(summary.totalWithdrawn).toBe(240);
      expect(summary.displayTotalInvested).toBe(1000);
      expect(summary.displayTotalWithdrawn).toBe(240);
      expect(summary.displayCurrency).toBe('USD');
    });
  });
});
