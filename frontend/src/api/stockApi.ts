import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL, type Currency } from '../constants';
import type {
  ApiErrorResponse,
  StockQuote,
  StockHistoryResponse,
  StockSearchResult,
  StockSector,
  StockCompareResponse,
  StockBacktestResponse,
  MarketMoversResponse,
  ApiSuccessResponse,
} from '../types/stock.types';

const apiClient = createApiClient(`${API_BASE_URL}/api/stocks`);

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const { data } = await apiClient.get<ApiSuccessResponse<StockQuote> | ApiErrorResponse>(
    `/quote/${ticker}`
  );
  return assertSuccess(data);
}

export async function fetchStockQuotesBatch(tickers: string[]): Promise<StockQuote[]> {
  const normalizedTickers = [...new Set(tickers.map((ticker) => ticker.toUpperCase()))].sort();

  if (normalizedTickers.length === 0) {
    return [];
  }

  const { data } = await apiClient.get<ApiSuccessResponse<StockQuote[]> | ApiErrorResponse>(
    '/quotes',
    {
      params: { tickers: normalizedTickers.join(',') },
    }
  );

  return assertSuccess(data);
}

export async function fetchStockHistory(
  ticker: string,
  period: string,
  interval: string
): Promise<StockHistoryResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<StockHistoryResponse> | ApiErrorResponse>(
    `/history/${ticker}`,
    {
      params: { period, interval },
    }
  );
  return assertSuccess(data);
}

export async function fetchStockSearch(query: string): Promise<StockSearchResult[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<StockSearchResult[]> | ApiErrorResponse>(
    '/search',
    { params: { q: query } }
  );
  return assertSuccess(data);
}

export async function fetchTickerTape(): Promise<StockQuote[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<StockQuote[]> | ApiErrorResponse>(
    '/ticker-tape'
  );
  return assertSuccess(data);
}

export async function fetchStockSector(ticker: string): Promise<StockSector> {
  const { data } = await apiClient.get<ApiSuccessResponse<StockSector> | ApiErrorResponse>(
    `/sector/${ticker}`
  );
  return assertSuccess(data);
}

export async function fetchMarketMovers(): Promise<MarketMoversResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<MarketMoversResponse> | ApiErrorResponse>(
    '/movers'
  );
  return assertSuccess(data);
}

export async function fetchStockCompare(tickers: string[]): Promise<StockCompareResponse> {
  const normalizedTickers = [...new Set(tickers.map((ticker) => ticker.toUpperCase()))].sort();

  const { data } = await apiClient.get<ApiSuccessResponse<StockCompareResponse> | ApiErrorResponse>(
    '/compare',
    {
      params: { tickers: normalizedTickers.join(',') },
    }
  );

  return assertSuccess(data);
}

export async function fetchStockBacktest(params: {
  allocations: Array<{ ticker: string; weightPercent: number }>;
  period: string;
  amount: number;
  displayCurrency: Currency;
}): Promise<StockBacktestResponse> {
  const tickers = params.allocations.map((allocation) => allocation.ticker.toUpperCase());
  const weights = params.allocations.map((allocation) => allocation.weightPercent);

  const { data } = await apiClient.get<
    ApiSuccessResponse<StockBacktestResponse> | ApiErrorResponse
  >('/backtest', {
    params: {
      tickers: tickers.join(','),
      weights: weights.join(','),
      period: params.period,
      amount: params.amount,
      displayCurrency: params.displayCurrency,
    },
  });

  return assertSuccess(data);
}
