import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { AddWatchlistPayload, StoredWatchlistItem } from '../types/watchlist.types';

const watchlistApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/portfolio/watchlist`,
  withCredentials: true,
});

function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) throw new Error((data as ApiErrorResponse).error ?? 'Unknown error');
  return (data as ApiSuccessResponse<T>).data;
}

function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const body = error.response.data as ApiErrorResponse;
    if (body.error) return body.error;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export async function fetchWatchlistItems(): Promise<StoredWatchlistItem[]> {
  const { data } = await watchlistApiClient.get<
    ApiSuccessResponse<StoredWatchlistItem[]> | ApiErrorResponse
  >('/');
  return assertSuccess(data);
}

export async function createWatchlistItem(
  payload: AddWatchlistPayload
): Promise<StoredWatchlistItem> {
  try {
    const { data } = await watchlistApiClient.post<
      ApiSuccessResponse<StoredWatchlistItem> | ApiErrorResponse
    >('/', payload);
    return assertSuccess(data);
  } catch (error) {
    throw new Error(extractApiError(error), { cause: error });
  }
}

export async function deleteWatchlistItem(itemId: string): Promise<void> {
  await watchlistApiClient.delete(`/${itemId}`);
}
