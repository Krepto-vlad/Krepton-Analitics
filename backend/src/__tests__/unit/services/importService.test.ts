jest.mock('../../../utils/excelSafeReader.js', () => ({
  readSafeTabularBuffer: jest.fn(),
}));

jest.mock('../../../services/brokerParsers/index.js', () => ({
  parseBrokerStatement: jest.fn(),
}));

jest.mock('../../../services/importPreviewStore.js', () => ({
  saveImportPreview: jest.fn(),
  consumeImportPreview: jest.fn(),
}));

jest.mock('../../../repositories/portfolioRepository.js', () => ({
  findOrCreatePortfolioAccount: jest.fn(),
  getAllTransactionsForDedup: jest.fn(),
}));

jest.mock('../../../services/portfolioService.js', () => ({
  confirmImportedTrades: jest.fn(),
}));

import { IMPORT_DEFAULT_BROKER_ID } from '../../../constants.js';
import {
  findOrCreatePortfolioAccount,
  getAllTransactionsForDedup,
} from '../../../repositories/portfolioRepository.js';
import { parseBrokerStatement } from '../../../services/brokerParsers/index.js';
import { consumeImportPreview, saveImportPreview } from '../../../services/importPreviewStore.js';
import { confirmBrokerImport, previewBrokerImport } from '../../../services/importService.js';
import { confirmImportedTrades } from '../../../services/portfolioService.js';
import { readSafeTabularBuffer } from '../../../utils/excelSafeReader.js';
import { buildTradeFingerprint } from '../../../utils/tradeFingerprint.js';
import type { NormalizedTrade } from '../../../types/import.types.js';

const mockedRead = readSafeTabularBuffer as jest.MockedFunction<typeof readSafeTabularBuffer>;
const mockedParse = parseBrokerStatement as jest.MockedFunction<typeof parseBrokerStatement>;
const mockedSave = saveImportPreview as jest.MockedFunction<typeof saveImportPreview>;
const mockedConsume = consumeImportPreview as jest.MockedFunction<typeof consumeImportPreview>;
const mockedFindOrCreate = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetAllTx = getAllTransactionsForDedup as jest.MockedFunction<
  typeof getAllTransactionsForDedup
>;
const mockedConfirm = confirmImportedTrades as jest.MockedFunction<typeof confirmImportedTrades>;

function trade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    rowNumber: 2,
    ticker: 'AAPL',
    companyName: 'Apple',
    transactionType: 'BUY',
    shares: 3,
    pricePerShare: 50,
    currency: 'USD',
    transactionDate: '2026-01-02',
    sourceType: 'csv',
    sourceRowHash: 'row-hash',
    ...overrides,
  };
}

describe('importService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOrCreate.mockResolvedValue('pf-1');
  });

  describe('previewBrokerImport', () => {
    it('parses the file, counts duplicates against existing trades, and stores a preview', async () => {
      const incoming = trade();
      mockedRead.mockReturnValue({
        sheetName: 'Sheet1',
        rows: [[], [], []],
      });
      mockedParse.mockResolvedValue({
        trades: [incoming, trade({ rowNumber: 3, ticker: 'MSFT', shares: 1, pricePerShare: 20 })],
        skipped: [{ rowNumber: 4, sourceType: 'csv', reason: 'bad ticker' }],
        meta: {
          mode: 'heuristic',
          confidence: 0.9,
          columnMapping: null,
          headerFingerprint: null,
          warning: null,
        },
      });
      mockedGetAllTx.mockResolvedValue([
        {
          id: 'tx-1',
          portfolio_id: 'pf-1',
          ticker: incoming.ticker,
          company_name: incoming.companyName,
          shares: String(incoming.shares),
          price_per_share: String(incoming.pricePerShare),
          currency: incoming.currency,
          transaction_date: incoming.transactionDate,
          transaction_type: incoming.transactionType,
          created_at: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]);
      mockedSave.mockReturnValue('import-1');

      const preview = await previewBrokerImport('user-1', Buffer.from('csv'), 'trades.csv');

      expect(mockedParse).toHaveBeenCalled();
      expect(mockedSave).toHaveBeenCalledWith('user-1', IMPORT_DEFAULT_BROKER_ID, [
        incoming,
        expect.objectContaining({ ticker: 'MSFT' }),
      ]);
      expect(preview.importId).toBe('import-1');
      expect(preview.summary).toEqual({
        totalRows: 3,
        tradeCount: 2,
        buyCount: 2,
        sellCount: 0,
        skippedCount: 1,
        duplicateCount: 1,
      });
      expect(buildTradeFingerprint(incoming)).toContain('AAPL');
    });
  });

  describe('confirmBrokerImport', () => {
    it('throws 404 when the preview is missing', async () => {
      mockedConsume.mockReturnValue(null);

      await expect(confirmBrokerImport('user-1', 'missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('confirms stored trades for the owner', async () => {
      const trades = [trade()];
      mockedConsume.mockReturnValue({ broker: 'GENERIC', trades });
      mockedConfirm.mockResolvedValue({
        importedCount: 1,
        skippedDuplicateCount: 0,
        affectedTickers: ['AAPL'],
      });

      await expect(confirmBrokerImport('user-1', 'import-1')).resolves.toEqual({
        importedCount: 1,
        skippedDuplicateCount: 0,
        affectedTickers: ['AAPL'],
      });
      expect(mockedConfirm).toHaveBeenCalledWith('user-1', 'GENERIC', trades);
    });
  });
});
