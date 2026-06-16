import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type {
  ApiErrorResponse,
  StockQuote,
  StockHistoryResponse,
  StockSearchResult,
} from '../types/stock.types';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/stocks`,
  withCredentials: true,
});

function assertSuccess<T>(data: { success: boolean; data?: T; error?: string }): T {
  if (!data.success) throw new Error((data as ApiErrorResponse).error ?? 'Unknown error');
  return data.data as T;
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const { data } = await apiClient.get(`/quote/${ticker}`);
  return assertSuccess<StockQuote>(data);
}

export async function fetchStockHistory(
  ticker: string,
  period: string,
  interval: string
): Promise<StockHistoryResponse> {
  const { data } = await apiClient.get(`/history/${ticker}`, {
    params: { period, interval },
  });
  return assertSuccess<StockHistoryResponse>(data);
}

export async function fetchStockSearch(query: string): Promise<StockSearchResult[]> {
  const { data } = await apiClient.get('/search', { params: { q: query } });
  return assertSuccess<StockSearchResult[]>(data);
}

export async function fetchTickerTape(): Promise<StockQuote[]> {
  const { data } = await apiClient.get('/ticker-tape');
  return assertSuccess<StockQuote[]>(data);
}
