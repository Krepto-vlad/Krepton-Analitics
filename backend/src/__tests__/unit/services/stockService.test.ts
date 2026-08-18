const mockGet = jest.fn();
const mockHistorical = jest.fn();
const mockQuoteSummary = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: (...args: unknown[]) => mockGet(...args),
    })),
  },
}));

jest.mock('yahoo-finance2', () =>
  jest.fn().mockImplementation(() => ({
    historical: (...args: unknown[]) => mockHistorical(...args),
    quoteSummary: (...args: unknown[]) => mockQuoteSummary(...args),
  }))
);

jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuote: jest.fn(),
  getCachedStockQuotes: jest.fn(),
}));

import { getCachedStockQuote, getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';
import {
  getStockCompare,
  getStockFundamentals,
  getStockHistory,
  getStockQuote,
  getStockQuotes,
  getStockSector,
  getTickerTapeQuotes,
  searchStocks,
} from '../../../services/stockService.js';

const mockedGetCachedQuote = getCachedStockQuote as jest.MockedFunction<typeof getCachedStockQuote>;
const mockedGetCachedQuotes = getCachedStockQuotes as jest.MockedFunction<
  typeof getCachedStockQuotes
>;

describe('stockService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockQuote', () => {
    it('returns a quote with a positive price', async () => {
      const liveQuote = { ...buildEmptyStockQuote('AAPL'), price: 190, name: 'Apple Inc.' };
      mockedGetCachedQuote.mockResolvedValue(liveQuote);

      await expect(getStockQuote('aapl')).resolves.toEqual(liveQuote);
      expect(mockedGetCachedQuote).toHaveBeenCalledWith('AAPL');
    });

    it('throws 404 when the cache has no usable price', async () => {
      mockedGetCachedQuote.mockResolvedValue(buildEmptyStockQuote('ZZZZ'));

      await expect(getStockQuote('ZZZZ')).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('ZZZZ'),
      });
    });
  });

  describe('getStockQuotes', () => {
    it('normalizes tickers before hitting the cache', async () => {
      mockedGetCachedQuotes.mockResolvedValue([buildEmptyStockQuote('MSFT')]);

      await getStockQuotes(['msft']);

      expect(mockedGetCachedQuotes).toHaveBeenCalledWith(['MSFT']);
    });
  });

  describe('searchStocks', () => {
    it('maps Yahoo search quotes and drops non-Yahoo rows', async () => {
      mockGet.mockResolvedValue({
        data: {
          quotes: [
            {
              symbol: 'AAPL',
              longname: 'Apple Inc.',
              exchDisp: 'NASDAQ',
              typeDisp: 'Equity',
              isYahooFinance: true,
            },
            {
              symbol: 'SKIP',
              isYahooFinance: false,
            },
          ],
        },
      });

      const results = await searchStocks('apple');

      expect(results).toEqual([
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
      ]);
    });

    it('returns an empty list when Yahoo sends no quotes', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await expect(searchStocks('zzz')).resolves.toEqual([]);
    });
  });

  describe('getStockHistory', () => {
    it('maps historical rows into candles', async () => {
      mockHistorical.mockResolvedValue([
        {
          date: new Date('2026-01-02T00:00:00.000Z'),
          open: 10,
          high: 12,
          low: 9,
          close: 11,
          volume: 100,
        },
      ]);

      const history = await getStockHistory('voo', '1mo', '1d');

      expect(history.ticker).toBe('VOO');
      expect(history.interval).toBe('1d');
      expect(history.candles).toHaveLength(1);
      expect(history.candles[0]).toEqual(
        expect.objectContaining({
          open: 10,
          high: 12,
          low: 9,
          close: 11,
          volume: 100,
        })
      );
    });

    it('throws when Yahoo returns no rows', async () => {
      mockHistorical.mockResolvedValue([]);

      await expect(getStockHistory('NOSUCH', '1mo', '1d')).rejects.toThrow(/No history found/);
    });
  });

  describe('getStockSector', () => {
    it('reads sector from assetProfile', async () => {
      mockQuoteSummary.mockResolvedValue({
        assetProfile: { sector: 'Technology', industry: 'Consumer Electronics' },
      });

      await expect(getStockSector('AAPL')).resolves.toEqual({
        sector: 'Technology',
        industry: 'Consumer Electronics',
      });
    });

    it('falls back to Other when Yahoo fails', async () => {
      mockQuoteSummary.mockRejectedValue(new Error('crumb'));

      await expect(getStockSector('VOO')).resolves.toEqual({ sector: 'Other', industry: '' });
    });
  });

  describe('getStockFundamentals / compare', () => {
    it('builds a compare row from quote + summary modules', async () => {
      mockedGetCachedQuote.mockResolvedValue({
        ...buildEmptyStockQuote('MSFT'),
        name: 'Microsoft',
        price: 400,
        marketCap: 1,
      });
      mockQuoteSummary.mockResolvedValue({
        assetProfile: { sector: 'Technology', industry: 'Software' },
        summaryDetail: { trailingPE: 30 },
        financialData: { returnOnEquity: 0.2 },
        defaultKeyStatistics: {},
      });

      const item = await getStockFundamentals('msft');

      expect(item).toEqual(
        expect.objectContaining({
          ticker: 'MSFT',
          name: 'Microsoft',
          price: 400,
          sector: 'Technology',
          peRatio: 30,
          roe: 20,
        })
      );
    });

    it('deduplicates tickers in compare', async () => {
      mockedGetCachedQuote.mockResolvedValue(buildEmptyStockQuote('AAPL'));
      mockQuoteSummary.mockResolvedValue({});

      const result = await getStockCompare(['aapl', 'AAPL']);

      expect(result.tickers).toEqual(['AAPL']);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getTickerTapeQuotes', () => {
    it('returns the in-memory tape without calling Yahoo', () => {
      const tape = getTickerTapeQuotes();

      expect(tape.length).toBeGreaterThan(0);
      expect(tape[0]).toEqual(expect.objectContaining({ ticker: expect.any(String) }));
    });
  });
});
