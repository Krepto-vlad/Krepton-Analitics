jest.mock('../../../config/env.js', () => ({
  env: {
    frontendUrl: 'http://localhost:5173',
    portfolioSecret: 'test-portfolio-secret',
  },
  isSnaptradeConfigured: true,
}));

jest.mock('../../../services/snaptradeClient.js', () => ({
  requireSnaptradeClient: jest.fn(),
}));

jest.mock('../../../repositories/snaptradeRepository.js', () => ({
  findSnaptradeUserByUserId: jest.fn(),
  upsertSnaptradeUser: jest.fn(),
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
  confirmSnaptradeHoldings: jest.fn(),
}));

import {
  SNAPTRADE_BROKER_ID,
  SNAPTRADE_NOT_CONNECTED_MESSAGE,
  SNAPTRADE_PREVIEW_WARNING,
} from '../../../constants.js';
import {
  findOrCreatePortfolioAccount,
  getAllTransactionsForDedup,
} from '../../../repositories/portfolioRepository.js';
import {
  findSnaptradeUserByUserId,
  upsertSnaptradeUser,
} from '../../../repositories/snaptradeRepository.js';
import { consumeImportPreview, saveImportPreview } from '../../../services/importPreviewStore.js';
import { confirmSnaptradeHoldings } from '../../../services/portfolioService.js';
import { requireSnaptradeClient } from '../../../services/snaptradeClient.js';
import {
  confirmBrokerSyncHoldings,
  createBrokerSyncPortalUrl,
  parseSnaptradeBroker,
  previewBrokerSyncHoldings,
} from '../../../services/brokerSyncService.js';

const mockedRequireClient = requireSnaptradeClient as jest.MockedFunction<
  typeof requireSnaptradeClient
>;
const mockedFindSnaptradeUser = findSnaptradeUserByUserId as jest.MockedFunction<
  typeof findSnaptradeUserByUserId
>;
const mockedUpsertSnaptradeUser = upsertSnaptradeUser as jest.MockedFunction<
  typeof upsertSnaptradeUser
>;
const mockedSavePreview = saveImportPreview as jest.MockedFunction<typeof saveImportPreview>;
const mockedConsumePreview = consumeImportPreview as jest.MockedFunction<
  typeof consumeImportPreview
>;
const mockedFindPortfolio = findOrCreatePortfolioAccount as jest.MockedFunction<
  typeof findOrCreatePortfolioAccount
>;
const mockedGetAllTx = getAllTransactionsForDedup as jest.MockedFunction<
  typeof getAllTransactionsForDedup
>;
const mockedConfirmHoldings = confirmSnaptradeHoldings as jest.MockedFunction<
  typeof confirmSnaptradeHoldings
>;

function snaptradeUser() {
  return {
    user_id: 'user-1',
    snaptrade_user_id: 'user-1',
    user_secret: 'secret-1',
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe('brokerSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unknown broker slugs', () => {
    expect(() => parseSnaptradeBroker('REVOLUT')).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(parseSnaptradeBroker('TRADING212')).toBe('TRADING212');
  });

  it('registers a SnapTrade user once and returns a https portal URL', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(null);
    mockedUpsertSnaptradeUser.mockResolvedValue(snaptradeUser());
    const loginSnapTradeUser = jest.fn().mockResolvedValue({
      data: { redirectURI: 'https://app.snaptrade.com/portal/abc' },
    });
    mockedRequireClient.mockReturnValue({
      authentication: {
        registerSnapTradeUser: jest.fn().mockResolvedValue({
          data: { userId: 'user-1', userSecret: 'secret-1' },
        }),
        loginSnapTradeUser,
      },
    } as never);

    await expect(createBrokerSyncPortalUrl('user-1', 'TRADING212')).resolves.toEqual({
      redirectUrl: 'https://app.snaptrade.com/portal/abc',
    });
    expect(loginSnapTradeUser).toHaveBeenCalledWith(
      expect.objectContaining({
        broker: 'TRADING212',
        connectionType: 'read',
        customRedirect: 'http://localhost:5173/portfolio?section=importer&brokerSync=connected',
      })
    );
  });

  it('previews holdings and skips tickers that already have non-snaptrade trades', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(snaptradeUser());
    mockedFindPortfolio.mockResolvedValue('pf-1');
    mockedGetAllTx.mockResolvedValue([
      {
        id: 'tx-1',
        portfolio_id: 'pf-1',
        ticker: 'AAPL',
        company_name: 'Apple',
        shares: '1',
        price_per_share: '10',
        currency: 'USD',
        transaction_date: '2026-01-01',
        transaction_type: 'BUY',
        source: 'import',
        created_at: new Date(),
      },
    ]);
    mockedSavePreview.mockReturnValue('import-1');
    mockedRequireClient.mockReturnValue({
      accountInformation: {
        listUserAccounts: jest.fn().mockResolvedValue({
          data: [{ id: 'acct-1' }],
        }),
        getUserHoldings: jest.fn().mockResolvedValue({
          data: {
            positions: [
              {
                symbol: { symbol: { symbol: 'AAPL' }, description: 'Apple' },
                units: 10,
                average_purchase_price: 150,
                currency: { code: 'USD' },
              },
              {
                symbol: { symbol: { symbol: 'MSFT' }, description: 'Microsoft' },
                units: 2,
                average_purchase_price: 400,
                currency: { code: 'USD' },
              },
            ],
          },
        }),
      },
    } as never);

    const preview = await previewBrokerSyncHoldings('user-1');

    expect(preview.broker).toBe(SNAPTRADE_BROKER_ID);
    expect(preview.parserMode).toBe('broker_sync');
    expect(preview.warning).toBe(SNAPTRADE_PREVIEW_WARNING);
    expect(preview.trades.map((trade) => trade.ticker)).toEqual(['MSFT']);
    expect(preview.summary.duplicateCount).toBe(1);
    expect(mockedSavePreview).toHaveBeenCalledWith('user-1', 'SNAPTRADE', preview.trades);
  });

  it('requires a stored SnapTrade user before preview', async () => {
    mockedFindSnaptradeUser.mockResolvedValue(null);

    await expect(previewBrokerSyncHoldings('user-1')).rejects.toMatchObject({
      statusCode: 400,
      message: SNAPTRADE_NOT_CONNECTED_MESSAGE,
    });
  });

  it('confirms only SnapTrade previews', async () => {
    mockedConsumePreview.mockReturnValue({
      broker: 'GENERIC',
      trades: [],
    });

    await expect(confirmBrokerSyncHoldings('user-1', 'import-1')).rejects.toMatchObject({
      statusCode: 400,
    });

    mockedConsumePreview.mockReturnValue({
      broker: 'SNAPTRADE',
      trades: [
        {
          rowNumber: 1,
          ticker: 'MSFT',
          companyName: 'Microsoft',
          transactionType: 'BUY',
          shares: 2,
          pricePerShare: 400,
          currency: 'USD',
          transactionDate: '2026-09-13',
          sourceType: 'snaptrade',
          sourceRowHash: 'hash',
        },
      ],
    });
    mockedConfirmHoldings.mockResolvedValue({
      importedCount: 1,
      skippedDuplicateCount: 0,
      affectedTickers: ['MSFT'],
    });

    await expect(confirmBrokerSyncHoldings('user-1', 'import-1')).resolves.toEqual({
      importedCount: 1,
      skippedDuplicateCount: 0,
      affectedTickers: ['MSFT'],
    });
  });
});
