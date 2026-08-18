jest.mock('../../../services/portfolioService.js', () => ({
  getUserPositions: jest.fn(),
  getUserPositionsPaginated: jest.fn(),
  getUserTransactionsPaginated: jest.fn(),
  getPortfolioEquityHistory: jest.fn(),
  getInvestmentSummary: jest.fn(),
  getBuyTransactionsForTicker: jest.fn(),
  getTransactionsForTicker: jest.fn(),
  createPosition: jest.fn(),
  editPosition: jest.fn(),
  removePosition: jest.fn(),
  removeBuyTransaction: jest.fn(),
  closePosition: jest.fn(),
  getUserPortfolioNews: jest.fn(),
  getUserPortfolioDividendCalendar: jest.fn(),
  getUserPortfolioRebalancingAnalysis: jest.fn(),
  updateUserPortfolioRebalancingStrategy: jest.fn(),
  getRebalancingStrategyCatalog: jest.fn(),
  deleteUserPortfolioData: jest.fn(),
  exportUserPortfolioData: jest.fn(),
}));

jest.mock('../../../services/newsSummaryService.js', () => ({
  generateUserNewsSummary: jest.fn(),
  getNewsSummaryQuota: jest.fn(),
}));

jest.mock('../../../services/alignmentExplainService.js', () => ({
  generateAlignmentExplanation: jest.fn(),
  getAlignmentExplanationQuota: jest.fn(),
}));

jest.mock('../../../services/tickerChatService.js', () => ({
  getTickerChatQuota: jest.fn(),
  sendTickerChatMessage: jest.fn(),
}));

jest.mock('../../../utils/portfolioExportWorkbook.js', () => ({
  buildPortfolioExportXlsxBuffer: jest.fn(),
}));

import {
  deletePortfolioDataHandler,
  deletePosition,
  deleteTransaction,
  exportPortfolioDataHandler,
  getAlignmentExplanationQuotaHandler,
  getBuyTransactions,
  getEquityHistory,
  getInvestmentSummaryHandler,
  getNewsSummaryQuotaHandler,
  getPortfolioDividendsHandler,
  getPortfolioNewsHandler,
  getPortfolioRebalancingHandler,
  getPositions,
  getRebalancingStrategiesHandler,
  getTickerChatQuotaHandler,
  getTickerTransactions,
  getTransactions,
  patchPosition,
  postAlignmentExplanationHandler,
  postClosePosition,
  postNewsSummaryHandler,
  postPosition,
  postTickerChatHandler,
  updatePortfolioRebalancingHandler,
} from '../../../controllers/portfolioController.js';
import {
  closePosition,
  createPosition,
  deleteUserPortfolioData,
  editPosition,
  exportUserPortfolioData,
  getBuyTransactionsForTicker,
  getInvestmentSummary,
  getPortfolioEquityHistory,
  getRebalancingStrategyCatalog,
  getTransactionsForTicker,
  getUserPortfolioDividendCalendar,
  getUserPortfolioNews,
  getUserPortfolioRebalancingAnalysis,
  getUserPositions,
  getUserPositionsPaginated,
  getUserTransactionsPaginated,
  removeBuyTransaction,
  removePosition,
  updateUserPortfolioRebalancingStrategy,
} from '../../../services/portfolioService.js';
import {
  generateUserNewsSummary,
  getNewsSummaryQuota,
} from '../../../services/newsSummaryService.js';
import {
  generateAlignmentExplanation,
  getAlignmentExplanationQuota,
} from '../../../services/alignmentExplainService.js';
import { getTickerChatQuota, sendTickerChatMessage } from '../../../services/tickerChatService.js';
import { buildPortfolioExportXlsxBuffer } from '../../../utils/portfolioExportWorkbook.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedGetPositions = getUserPositions as jest.MockedFunction<typeof getUserPositions>;
const mockedGetPositionsPage = getUserPositionsPaginated as jest.MockedFunction<
  typeof getUserPositionsPaginated
>;
const mockedGetTxPage = getUserTransactionsPaginated as jest.MockedFunction<
  typeof getUserTransactionsPaginated
>;
const mockedEquity = getPortfolioEquityHistory as jest.MockedFunction<
  typeof getPortfolioEquityHistory
>;
const mockedSummary = getInvestmentSummary as jest.MockedFunction<typeof getInvestmentSummary>;
const mockedNews = getUserPortfolioNews as jest.MockedFunction<typeof getUserPortfolioNews>;
const mockedNewsQuota = getNewsSummaryQuota as jest.MockedFunction<typeof getNewsSummaryQuota>;
const mockedNewsSummary = generateUserNewsSummary as jest.MockedFunction<
  typeof generateUserNewsSummary
>;
const mockedAlignQuota = getAlignmentExplanationQuota as jest.MockedFunction<
  typeof getAlignmentExplanationQuota
>;
const mockedAlign = generateAlignmentExplanation as jest.MockedFunction<
  typeof generateAlignmentExplanation
>;
const mockedChatQuota = getTickerChatQuota as jest.MockedFunction<typeof getTickerChatQuota>;
const mockedChat = sendTickerChatMessage as jest.MockedFunction<typeof sendTickerChatMessage>;
const mockedDividends = getUserPortfolioDividendCalendar as jest.MockedFunction<
  typeof getUserPortfolioDividendCalendar
>;
const mockedRebalance = getUserPortfolioRebalancingAnalysis as jest.MockedFunction<
  typeof getUserPortfolioRebalancingAnalysis
>;
const mockedCatalog = getRebalancingStrategyCatalog as jest.MockedFunction<
  typeof getRebalancingStrategyCatalog
>;
const mockedUpdateRebalance = updateUserPortfolioRebalancingStrategy as jest.MockedFunction<
  typeof updateUserPortfolioRebalancingStrategy
>;
const mockedBuys = getBuyTransactionsForTicker as jest.MockedFunction<
  typeof getBuyTransactionsForTicker
>;
const mockedTickerTx = getTransactionsForTicker as jest.MockedFunction<
  typeof getTransactionsForTicker
>;
const mockedDeleteData = deleteUserPortfolioData as jest.MockedFunction<
  typeof deleteUserPortfolioData
>;
const mockedExport = exportUserPortfolioData as jest.MockedFunction<typeof exportUserPortfolioData>;
const mockedXlsx = buildPortfolioExportXlsxBuffer as jest.MockedFunction<
  typeof buildPortfolioExportXlsxBuffer
>;
const mockedCreate = createPosition as jest.MockedFunction<typeof createPosition>;
const mockedEdit = editPosition as jest.MockedFunction<typeof editPosition>;
const mockedRemove = removePosition as jest.MockedFunction<typeof removePosition>;
const mockedRemoveBuy = removeBuyTransaction as jest.MockedFunction<typeof removeBuyTransaction>;
const mockedClose = closePosition as jest.MockedFunction<typeof closePosition>;

describe('portfolioController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects handlers without a user id', async () => {
    await expect(
      getPositions(createMockRequest({ userId: undefined }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns the full holdings list or a page when limit is set', async () => {
    mockedGetPositions.mockResolvedValue([]);
    mockedGetPositionsPage.mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
    const res = createMockResponse();

    await getPositions(createMockRequest({ query: { displayCurrency: 'USD' } }), asResponse(res));
    await getPositions(createMockRequest({ query: { limit: '10', offset: '0' } }), asResponse(res));

    expect(mockedGetPositions).toHaveBeenCalled();
    expect(mockedGetPositionsPage).toHaveBeenCalled();
  });

  it('forwards list, summary, news and AI quota handlers', async () => {
    mockedGetTxPage.mockResolvedValue({
      items: [],
      total: 0,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
    mockedEquity.mockResolvedValue([]);
    mockedSummary.mockResolvedValue({} as never);
    mockedNews.mockResolvedValue([]);
    mockedNewsQuota.mockResolvedValue({ used: 0, limit: 5, remaining: 5, resetsAt: 'x' });
    mockedNewsSummary.mockResolvedValue({} as never);
    mockedAlignQuota.mockResolvedValue({ used: 0, limit: 5, remaining: 5, resetsAt: 'x' });
    mockedAlign.mockResolvedValue({} as never);
    mockedChatQuota.mockResolvedValue({ used: 0, limit: 20, remaining: 20, resetsAt: 'x' });
    mockedChat.mockResolvedValue({} as never);
    mockedDividends.mockResolvedValue({} as never);
    mockedRebalance.mockResolvedValue({} as never);
    mockedCatalog.mockReturnValue([]);
    mockedUpdateRebalance.mockResolvedValue({} as never);
    mockedBuys.mockResolvedValue([]);
    mockedTickerTx.mockResolvedValue([]);
    const res = createMockResponse();
    const req = createMockRequest({
      query: { displayCurrency: 'USD' },
      params: { ticker: 'AAPL' },
      body: { tickers: ['AAPL'] },
    });

    await getTransactions(req, asResponse(res));
    await getEquityHistory(req, asResponse(res));
    await getInvestmentSummaryHandler(req, asResponse(res));
    await getPortfolioNewsHandler(req, asResponse(res));
    await getNewsSummaryQuotaHandler(req, asResponse(res));
    await postNewsSummaryHandler(req, asResponse(res));
    await getAlignmentExplanationQuotaHandler(req, asResponse(res));
    await postAlignmentExplanationHandler(req, asResponse(res));
    await getTickerChatQuotaHandler(req, asResponse(res));
    await postTickerChatHandler(req, asResponse(res));
    await getPortfolioDividendsHandler(req, asResponse(res));
    await getPortfolioRebalancingHandler(req, asResponse(res));
    await getRebalancingStrategiesHandler(req, asResponse(res));
    await updatePortfolioRebalancingHandler(req, asResponse(res));
    await getBuyTransactions(req, asResponse(res));
    await getTickerTransactions(req, asResponse(res));

    expect(res.json).toHaveBeenCalled();
  });

  it('creates, patches and deletes positions and buy lots', async () => {
    mockedCreate.mockResolvedValue({ id: 'pos-1' } as never);
    mockedEdit.mockResolvedValue({ id: 'pos-1' } as never);
    mockedRemove.mockResolvedValue(undefined);
    mockedRemoveBuy.mockResolvedValue(undefined);
    const res = createMockResponse();

    await postPosition(createMockRequest({ body: { ticker: 'AAPL' } }), asResponse(res));
    await patchPosition(
      createMockRequest({ params: { positionId: 'pos-1' }, body: { shares: 1 } }),
      asResponse(res)
    );
    await deletePosition(createMockRequest({ params: { positionId: 'pos-1' } }), asResponse(res));
    await deleteTransaction(
      createMockRequest({ params: { transactionId: 'tx-1' } }),
      asResponse(res)
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('marks a full close versus a partial close', async () => {
    mockedClose.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'pos-1' } as never);
    const res = createMockResponse();
    const req = createMockRequest({ params: { positionId: 'pos-1' }, body: { shares: 1 } });

    await postClosePosition(req, asResponse(res));
    await postClosePosition(req, asResponse(res));

    expect(res.json).toHaveBeenCalledWith({ success: true, data: null, closed: true });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'pos-1' },
      closed: false,
    });
  });

  it('deletes portfolio data after confirmation', async () => {
    mockedDeleteData.mockResolvedValue({
      deletedTransactions: 1,
      deletedPositions: 1,
      deletedWatchlistItems: 0,
    });
    const res = createMockResponse();

    await deletePortfolioDataHandler(
      createMockRequest({ body: { confirm: 'DELETE' } }),
      asResponse(res)
    );

    expect(mockedDeleteData).toHaveBeenCalledWith('user-1', 'DELETE');
  });

  it('exports JSON or XLSX and rejects an unknown format', async () => {
    mockedExport.mockResolvedValue({
      exportedAt: '2026-01-15T00:00:00.000Z',
      schemaVersion: 1,
    } as never);
    mockedXlsx.mockReturnValue(Buffer.from('xlsx'));
    const res = createMockResponse();

    await exportPortfolioDataHandler(
      createMockRequest({ body: { format: 'json' } }),
      asResponse(res)
    );
    await exportPortfolioDataHandler(createMockRequest({ body: {} }), asResponse(res));

    expect(mockedXlsx).toHaveBeenCalled();
    await expect(
      exportPortfolioDataHandler(
        createMockRequest({ body: { format: 'pdf' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
