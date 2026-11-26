jest.mock('../../../services/quoteCacheService.js', () => ({
  getCachedStockQuotes: jest.fn(),
}));

jest.mock('../../../services/stockService.js', () => ({
  getStockCompare: jest.fn(),
  searchStocks: jest.fn(),
}));

import { getCachedStockQuotes } from '../../../services/quoteCacheService.js';
import { getStockCompare, searchStocks } from '../../../services/stockService.js';
import { resolveQuestionMarket } from '../../../services/tickerChatQuestionContext.js';
import { buildEmptyStockQuote } from '../../../utils/stockQuoteDefaults.js';

const mockedQuotes = getCachedStockQuotes as jest.MockedFunction<typeof getCachedStockQuotes>;
const mockedSearch = searchStocks as jest.MockedFunction<typeof searchStocks>;
const mockedCompare = getStockCompare as jest.MockedFunction<typeof getStockCompare>;

describe('resolveQuestionMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a Russian company name and charts it when it is not the open page', async () => {
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('MSFT'), name: 'Microsoft', price: 420, changePercent: 1 },
    ]);

    const market = await resolveQuestionMarket('как поживает макрософт сегодня?', 'AAPL');

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(market.chartTicker).toBe('MSFT');
    expect(market.promptText).toContain('QUESTION MARKET DATA');
    expect(market.referencePrices).toContain(420);
  });

  it('does not chart the ticker that is already open', async () => {
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('MSFT'), name: 'Microsoft', price: 420, changePercent: 1 },
    ]);

    const market = await resolveQuestionMarket('how is MSFT today?', 'MSFT');

    expect(market.chartTicker).toBeNull();
    expect(market.focusTicker).toBe('MSFT');
  });

  it('searches an unknown company name and compares when asked', async () => {
    mockedSearch.mockResolvedValue([
      { ticker: 'ADBE', name: 'Adobe Inc.', exchange: 'NMS', type: 'Equity' },
    ]);
    mockedQuotes.mockResolvedValue([
      { ...buildEmptyStockQuote('AAPL'), name: 'Apple', price: 190, changePercent: 1 },
      { ...buildEmptyStockQuote('ADBE'), name: 'Adobe', price: 500, changePercent: -1 },
    ]);
    mockedCompare.mockResolvedValue({
      tickers: ['AAPL', 'ADBE'],
      items: [
        {
          ticker: 'AAPL',
          name: 'Apple',
          currency: 'USD',
          price: 190,
          sector: null,
          industry: null,
          marketCap: null,
          enterpriseValue: null,
          trailingEps: null,
          peRatio: 30,
          forwardPeRatio: null,
          pegRatio: null,
          psRatio: null,
          priceToBook: null,
          evToEbitda: null,
          roe: null,
          roa: null,
          profitMargin: 25,
          operatingMargin: null,
          revenueGrowth: 8,
          earningsGrowth: null,
          debtToEquity: null,
          currentRatio: null,
          dividendYield: null,
          payoutRatio: null,
          beta: null,
        },
        {
          ticker: 'ADBE',
          name: 'Adobe',
          currency: 'USD',
          price: 500,
          sector: null,
          industry: null,
          marketCap: null,
          enterpriseValue: null,
          trailingEps: null,
          peRatio: 40,
          forwardPeRatio: null,
          pegRatio: null,
          psRatio: null,
          priceToBook: null,
          evToEbitda: null,
          roe: null,
          roa: null,
          profitMargin: 30,
          operatingMargin: null,
          revenueGrowth: 10,
          earningsGrowth: null,
          debtToEquity: null,
          currentRatio: null,
          dividendYield: null,
          payoutRatio: null,
          beta: null,
        },
      ],
    });

    const market = await resolveQuestionMarket('Compare AAPL and Adobe', null);

    expect(mockedSearch).toHaveBeenCalledWith('Adobe');
    expect(mockedCompare).toHaveBeenCalledWith(['AAPL', 'ADBE']);
    expect(market.chartTicker).toBe('AAPL');
    expect(market.displayBlocks.some((block) => block.kind === 'compare-bars')).toBe(true);
  });

  it('returns an empty block when the message names no company', async () => {
    const market = await resolveQuestionMarket('What does this page show?', null);

    expect(mockedQuotes).not.toHaveBeenCalled();
    expect(market).toEqual(
      expect.objectContaining({
        promptText: null,
        chartTicker: null,
        displayBlocks: [],
      })
    );
  });

  it('keeps the caret on an explicit index ticker and formats it as a level', async () => {
    mockedQuotes.mockResolvedValue([
      {
        ...buildEmptyStockQuote('^GSPC'),
        name: 'S&P 500',
        price: 7182.78,
        changePercent: -0.25,
        currency: 'USD',
      },
    ]);

    const market = await resolveQuestionMarket('How is ^GSPC today?', null);

    expect(mockedQuotes).toHaveBeenCalledWith(['^GSPC']);
    expect(market.focusTicker).toBe('^GSPC');
    expect(market.chartTicker).toBe('^GSPC');
    expect(market.promptText).toContain('level 7182.78');
    expect(market.promptText).not.toContain('USD 7182.78');
  });

  it('resolves a dashboard index alias without a search call', async () => {
    mockedQuotes.mockResolvedValue([
      {
        ...buildEmptyStockQuote('^IXIC'),
        name: 'NASDAQ Composite',
        price: 23000,
        changePercent: 1.2,
        currency: 'USD',
      },
    ]);

    const market = await resolveQuestionMarket('What about the Nasdaq today?', null);

    expect(mockedSearch).not.toHaveBeenCalled();
    expect(mockedQuotes).toHaveBeenCalledWith(['^IXIC']);
    expect(market.focusTicker).toBe('^IXIC');
  });
});
