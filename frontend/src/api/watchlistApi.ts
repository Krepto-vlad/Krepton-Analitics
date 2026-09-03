import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { AddWatchlistPayload, StoredWatchlistItem } from '../types/watchlist.types';

const watchlistApiClient = createApiClient(`${API_BASE_URL}/api/portfolio/watchlist`);

export async function fetchWatchlistItems(): Promise<StoredWatchlistItem[]> {
  const { data } = await watchlistApiClient.get<
    ApiSuccessResponse<StoredWatchlistItem[]> | ApiErrorResponse
  >('/');
  return assertSuccess(data);
}

export async function createWatchlistItem(
  payload: AddWatchlistPayload
): Promise<StoredWatchlistItem> {
  const { data } = await watchlistApiClient.post<
    ApiSuccessResponse<StoredWatchlistItem> | ApiErrorResponse
  >('/', payload);
  return assertSuccess(data);
}

export async function deleteWatchlistItem(itemId: string): Promise<void> {
  await watchlistApiClient.delete(`/${itemId}`);
}
