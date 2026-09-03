jest.mock('../../../services/stockService.js', () => ({
  getStockQuote: jest.fn(),
  getStockQuotes: jest.fn(),
  getStockHistory: jest.fn(),
  getStockSector: jest.fn(),
  searchStocks: jest.fn(),
  getTickerTapeQuotes: jest.fn(),
  getStockCompare: jest.fn(),
  getStockFundamentals: jest.fn(),
}));

jest.mock('../../../services/marketMoversService.js', () => ({
  getMarketMovers: jest.fn(),
}));

jest.mock('../../../services/newsService.js', () => ({
  getPortfolioNews: jest.fn(),
}));

jest.mock('../../../services/backtestService.js', () => {
  const actual = jest.requireActual('../../../services/backtestService.js') as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    runStockBacktest: jest.fn(),
  };
});

import {
  getBacktest,
  getCompare,
  getFundamentals,
  getHistory,
  getMovers,
  getQuote,
  getQuotes,
  getSectorForTicker,
  getTickerNews,
  getTickerTape,
  searchTickers,
} from '../../../controllers/stockController.js';
import { runStockBacktest } from '../../../services/backtestService.js';
import { getMarketMovers } from '../../../services/marketMoversService.js';
import { getPortfolioNews } from '../../../services/newsService.js';
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
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedQuote = getStockQuote as jest.MockedFunction<typeof getStockQuote>;
const mockedQuotes = getStockQuotes as jest.MockedFunction<typeof getStockQuotes>;
const mockedHistory = getStockHistory as jest.MockedFunction<typeof getStockHistory>;
const mockedSector = getStockSector as jest.MockedFunction<typeof getStockSector>;
const mockedSearch = searchStocks as jest.MockedFunction<typeof searchStocks>;
const mockedTape = getTickerTapeQuotes as jest.MockedFunction<typeof getTickerTapeQuotes>;
const mockedCompare = getStockCompare as jest.MockedFunction<typeof getStockCompare>;
const mockedFundamentals = getStockFundamentals as jest.MockedFunction<typeof getStockFundamentals>;
const mockedMovers = getMarketMovers as jest.MockedFunction<typeof getMarketMovers>;
const mockedNews = getPortfolioNews as jest.MockedFunction<typeof getPortfolioNews>;
const mockedBacktest = runStockBacktest as jest.MockedFunction<typeof runStockBacktest>;

describe('stockController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a single quote and sector', async () => {
    mockedQuote.mockResolvedValue({ ticker: 'AAPL' } as never);
    mockedSector.mockResolvedValue({ sector: 'Technology', industry: 'Hardware' });
    const res = createMockResponse();

    await getQuote(createMockRequest({ params: { ticker: 'aapl' } }), asResponse(res));
    await getSectorForTicker(createMockRequest({ params: { ticker: 'aapl' } }), asResponse(res));

    expect(mockedQuote).toHaveBeenCalledWith('AAPL');
  });

  it('batches quotes and rejects empty or oversized lists', async () => {
    mockedQuotes.mockResolvedValue([]);
    const res = createMockResponse();

    await getQuotes(createMockRequest({ query: { tickers: 'aapl, msft' } }), asResponse(res));
    expect(mockedQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT']);

    await expect(
      getQuotes(createMockRequest({ query: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getQuotes(createMockRequest({ query: { tickers: ',,' } }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getQuotes(
        createMockRequest({
          query: { tickers: Array.from({ length: 51 }, (_, index) => `T${index}`).join(',') },
        }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('validates history period and interval', async () => {
    mockedHistory.mockResolvedValue({ ticker: 'AAPL', interval: '1d', candles: [] });
    const res = createMockResponse();

    await getHistory(createMockRequest({ params: { ticker: 'AAPL' }, query: {} }), asResponse(res));

    await expect(
      getHistory(
        createMockRequest({ params: { ticker: 'AAPL' }, query: { period: 'nope' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getHistory(
        createMockRequest({ params: { ticker: 'AAPL' }, query: { interval: 'nope' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getHistory(
        createMockRequest({ params: { ticker: '!!!' }, query: {} }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns fundamentals, ticker news, tape, movers and search', async () => {
    mockedFundamentals.mockResolvedValue({} as never);
    mockedNews.mockResolvedValue([]);
    mockedTape.mockReturnValue([]);
    mockedMovers.mockResolvedValue({} as never);
    mockedSearch.mockResolvedValue([]);
    const res = createMockResponse();

    await getFundamentals(createMockRequest({ params: { ticker: 'AAPL' } }), asResponse(res));
    await getTickerNews(createMockRequest({ params: { ticker: 'AAPL' } }), asResponse(res));
    getTickerTape(createMockRequest(), asResponse(res));
    await getMovers(createMockRequest(), asResponse(res));
    await searchTickers(createMockRequest({ query: { q: 'apple' } }), asResponse(res));

    await expect(
      searchTickers(createMockRequest({ query: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('validates compare ticker counts', async () => {
    mockedCompare.mockResolvedValue({} as never);
    const res = createMockResponse();

    await getCompare(createMockRequest({ query: { tickers: 'AAPL,MSFT' } }), asResponse(res));

    await expect(
      getCompare(createMockRequest({ query: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getCompare(
        createMockRequest({ query: { tickers: 'AAPL' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getCompare(
        createMockRequest({ query: { tickers: 'A,B,C,D,E' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('runs a single-ticker backtest and rejects invalid allocations', async () => {
    mockedBacktest.mockResolvedValue({} as never);
    const res = createMockResponse();

    await getBacktest(
      createMockRequest({ query: { tickers: 'AAPL', period: '3y' } }),
      asResponse(res)
    );
    expect(mockedBacktest).toHaveBeenCalledWith(
      expect.objectContaining({
        allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
        period: '3y',
        amount: 1000,
      })
    );

    await expect(
      getBacktest(createMockRequest({ query: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL', period: '2y' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL,MSFT' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL,AAPL', weights: '50,50' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL,MSFT', weights: '100' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL,MSFT', weights: '0,100' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL,MSFT', weights: '40,40' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({ query: { tickers: 'AAPL', amount: '0' } }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      getBacktest(
        createMockRequest({
          query: { tickers: 'A,B,C,D,E', weights: '20,20,20,20,20' },
        }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
