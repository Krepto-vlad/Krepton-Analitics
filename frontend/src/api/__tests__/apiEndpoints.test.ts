jest.mock('axios', () => {
  const http = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { response: { use: jest.fn() } },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => http),
      isAxiosError: jest.fn(() => false),
    },
    create: jest.fn(() => http),
    isAxiosError: jest.fn(() => false),
    __http: http,
  };
});

import * as axiosModule from 'axios';
import {
  apiChangePassword,
  apiDeleteAccount,
  apiForgotPassword,
  apiGetMe,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiRegister,
  apiResendVerification,
  apiResetPassword,
  apiVerifyEmail,
} from '../authApi';
import { clearLiveFxRateCache, fetchFxRate, fetchLiveFxRates } from '../fxApi';
import { confirmBrokerSync, connectBrokerSync, previewBrokerSync } from '../brokerSyncApi';
import { confirmBrokerImport, previewBrokerImport } from '../importApi';
import {
  closePortfolioPosition,
  createPortfolioPosition,
  deleteBuyTransaction,
  deletePortfolioData,
  deletePortfolioPosition,
  exportPortfolioData,
  fetchAlignmentExplanationQuota,
  fetchBuyTransactionsForTicker,
  fetchInvestmentSummary,
  fetchNewsSummaryQuota,
  fetchPortfolioDividends,
  fetchPortfolioEquityHistory,
  fetchPortfolioNews,
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioRebalancing,
  fetchPortfolioTransactionsPage,
  fetchRebalancingStrategies,
  fetchTickerChatQuota,
  fetchTickerTransactions,
  generateAlignmentExplanation,
  generateNewsSummary,
  sendTickerChatMessage,
  updatePortfolioPosition,
  updatePortfolioRebalancingStrategy,
} from '../portfolioApi';
import {
  fetchMarketMovers,
  fetchStockBacktest,
  fetchStockCompare,
  fetchStockFundamentals,
  fetchStockHistory,
  fetchStockNews,
  fetchStockQuote,
  fetchStockQuotesBatch,
  fetchStockSearch,
  fetchStockSector,
  fetchTickerTape,
} from '../stockApi';
import { createWatchlistItem, deleteWatchlistItem, fetchWatchlistItems } from '../watchlistApi';
import {
  apiCreateBillingCheckout,
  apiCreateBillingPortal,
  apiGrantAdminEntitlement,
  apiLookupAdminEntitlement,
} from '../billingApi';

const http = (
  axiosModule as unknown as {
    __http: {
      get: jest.Mock;
      post: jest.Mock;
      put: jest.Mock;
      patch: jest.Mock;
      delete: jest.Mock;
    };
  }
).__http;

function ok<T>(payload: T) {
  return { data: { success: true as const, data: payload } };
}

const user = {
  id: '1',
  email: 'a@b.c',
  createdAt: '2026-01-01',
  emailVerified: true,
  hasPassword: true,
  hasGoogle: false,
  isAdmin: false,
  subscription: {
    isPaid: false,
    plan: 'free',
    interval: null,
    source: null,
    status: 'none',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
  sessionExpiresAt: '2026-01-01T00:15:00.000Z',
};

jest.mock('../../utils/downloadFile', () => ({
  downloadJsonFile: jest.fn(),
  downloadBlobFile: jest.fn(),
  decodeBase64ToBlob: jest.fn(() => new Blob(['xlsx'])),
}));

describe('API clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLiveFxRateCache();
  });

  it('unwraps auth endpoints', async () => {
    http.post.mockResolvedValueOnce(ok({ email: 'a@b.c', message: 'ok' }));
    http.post.mockResolvedValueOnce(
      ok({
        id: '1',
        email: 'a@b.c',
        createdAt: '2026-01-01',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: false,
        sessionExpiresAt: '2026-01-01T00:15:00.000Z',
      })
    );
    http.get.mockResolvedValueOnce(
      ok({
        id: '1',
        email: 'a@b.c',
        createdAt: '2026-01-01',
        emailVerified: true,
        hasPassword: true,
        hasGoogle: false,
        sessionExpiresAt: '2026-01-01T00:15:00.000Z',
      })
    );
    http.post.mockResolvedValueOnce(ok({ message: 'sent' }));

    await apiRegister({ email: 'a@b.c', password: 'Abcdefgh1!' });
    await apiLogin({ email: 'a@b.c', password: 'Abcdefgh1!' });
    await apiGetMe();
    await apiForgotPassword('a@b.c');
    http.post.mockResolvedValueOnce(ok(user));
    http.post.mockResolvedValueOnce(ok(user));
    http.post.mockResolvedValueOnce(ok({ email: 'a@b.c', message: 'resent' }));
    http.post.mockResolvedValueOnce(undefined);
    http.put.mockResolvedValueOnce(ok({ message: 'updated' }));
    http.delete.mockResolvedValueOnce(ok({ message: 'gone' }));
    http.post.mockResolvedValueOnce(ok({ message: 'reset' }));

    await apiGoogleLogin('id-token');
    await apiVerifyEmail('verify-token');
    await apiResendVerification('a@b.c');
    await apiLogout();
    await apiChangePassword({ newPassword: 'Abcdefgh1!', password: 'Oldpass1!' });
    await apiDeleteAccount({ confirm: 'DELETE', password: 'Abcdefgh1!' });
    await apiResetPassword({ token: 'reset-token', newPassword: 'Abcdefgh1!' });

    expect(http.post).toHaveBeenCalled();
    expect(http.get).toHaveBeenCalled();
    expect(http.put).toHaveBeenCalled();
    expect(http.delete).toHaveBeenCalled();
  });

  it('returns identity FX rates and caches remote ones', async () => {
    expect(await fetchFxRate('USD', 'USD', '2026-09-08')).toEqual({
      base: 'USD',
      quote: 'USD',
      date: '2026-09-08',
      rate: 1,
    });

    http.get.mockResolvedValue(ok({ base: 'EUR', quote: 'USD', date: '2026-09-08', rate: 1.1 }));
    const first = await fetchLiveFxRates(['EUR', 'USD'], 'USD', '2026-09-08');
    const second = await fetchLiveFxRates(['EUR'], 'USD', '2026-09-08');
    expect(first.EUR).toBe(1.1);
    expect(second.EUR).toBe(1.1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('loads stock, watchlist, import, and portfolio helpers', async () => {
    http.get.mockResolvedValue(ok([]));
    http.post.mockResolvedValue(ok({ id: '1' }));
    http.patch.mockResolvedValue(ok({ id: 'p1' }));
    http.put.mockResolvedValue(ok({ strategyId: 'balanced' }));
    http.delete.mockResolvedValue({ data: undefined });

    await fetchStockQuote('aapl');
    await fetchStockQuotesBatch([]);
    await fetchStockQuotesBatch(['AAPL', 'aapl']);
    await fetchStockSearch('apple');
    await fetchTickerTape();
    await fetchMarketMovers();
    await fetchStockCompare(['AAPL']);
    await fetchStockBacktest({
      allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
      period: '5y',
      amount: 1000,
      displayCurrency: 'USD',
    });
    await fetchStockHistory('AAPL', '1y', '1d');
    await fetchStockSector('AAPL');
    await fetchStockFundamentals('aapl');
    await fetchStockNews('aapl');
    await fetchWatchlistItems();
    await createWatchlistItem({ ticker: 'AAPL', companyName: 'Apple' });
    await deleteWatchlistItem('w1');
    await previewBrokerImport(new File(['a'], 'a.csv', { type: 'text/csv' }));
    await confirmBrokerImport('imp-1');
    await connectBrokerSync('TRADING212');
    await previewBrokerSync();
    await confirmBrokerSync('imp-2');
    await fetchPortfolioPositions('USD');
    await fetchPortfolioPositionsPage(20, 0, 'USD');
    await fetchPortfolioTransactionsPage(20, 0);
    await fetchBuyTransactionsForTicker('AAPL');
    await fetchTickerTransactions('AAPL');
    await fetchInvestmentSummary('USD');
    await fetchPortfolioEquityHistory();
    await fetchPortfolioNews();
    await fetchNewsSummaryQuota();
    await fetchPortfolioDividends('USD');
    await fetchRebalancingStrategies();
    await fetchPortfolioRebalancing('EUR');
    await fetchAlignmentExplanationQuota();
    await fetchTickerChatQuota();
    await generateNewsSummary({ tickers: ['AAPL'] });
    await generateAlignmentExplanation('USD');
    await sendTickerChatMessage({
      ticker: 'AAPL',
      message: 'Why did it move?',
      history: [],
      includeHoldingContext: false,
    });
    await createPortfolioPosition({
      ticker: 'AAPL',
      companyName: 'Apple',
      shares: 1,
      avgBuyPrice: 10,
      currency: 'USD',
    });
    await updatePortfolioPosition('p1', { shares: 2 });
    await updatePortfolioRebalancingStrategy({ strategyId: 'bogleheads-three-fund' }, 'USD');
    await closePortfolioPosition('p1', {
      shares: 1,
      pricePerShare: 12,
      currency: 'USD',
    });
    await deleteBuyTransaction('t1');
    await deletePortfolioPosition('p1');
    http.delete.mockResolvedValueOnce(
      ok({ deletedTransactions: 1, deletedPositions: 1, deletedWatchlistItems: 0 })
    );
    await deletePortfolioData('DELETE');

    http.post.mockResolvedValueOnce(
      ok({ exportedAt: '2026-09-08T00:00:00.000Z', positions: [], transactions: [] })
    );
    await exportPortfolioData({ password: 'Abcdefgh1!' }, 'json');
    http.post.mockResolvedValueOnce(
      ok({
        fileName: 'export.xlsx',
        contentBase64: 'YQ==',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
    await exportPortfolioData({ password: 'Abcdefgh1!' }, 'xlsx');

    expect(http.get).toHaveBeenCalled();
    expect(http.post).toHaveBeenCalled();
    expect(http.delete).toHaveBeenCalled();
    expect(http.patch).toHaveBeenCalled();
    expect(http.put).toHaveBeenCalled();
  });

  it('unwraps billing checkout, portal, and admin grant endpoints', async () => {
    http.post.mockResolvedValueOnce(ok({ transactionId: 'txn_1' }));
    http.post.mockResolvedValueOnce(ok({ url: 'https://paddle.example/portal' }));
    http.post.mockResolvedValueOnce(
      ok({ email: 'friend@example.com', expiresAt: '2026-12-01T00:00:00.000Z', isPaid: true })
    );
    http.get.mockResolvedValueOnce(
      ok({ email: 'friend@example.com', expiresAt: '2026-12-01T00:00:00.000Z', isPaid: true })
    );

    await expect(apiCreateBillingCheckout('month')).resolves.toEqual({ transactionId: 'txn_1' });
    await expect(apiCreateBillingPortal()).resolves.toEqual({
      url: 'https://paddle.example/portal',
    });
    await expect(
      apiGrantAdminEntitlement('friend@example.com', '2026-12-01T00:00:00.000Z')
    ).resolves.toMatchObject({ isPaid: true });
    await expect(apiLookupAdminEntitlement('friend@example.com')).resolves.toMatchObject({
      email: 'friend@example.com',
    });
  });
});
