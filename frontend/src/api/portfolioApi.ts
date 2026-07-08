import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { PortfolioPosition } from '../types/portfolio.types';

const portfolioApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/portfolio`,
  withCredentials: true,
});

function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) throw new Error((data as ApiErrorResponse).error ?? 'Unknown error');
  return (data as ApiSuccessResponse<T>).data;
}

export async function fetchPortfolioPositions(): Promise<PortfolioPosition[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PortfolioPosition[]> | ApiErrorResponse
  >('/positions');
  return assertSuccess(data);
}

export async function createPortfolioPosition(
  position: Omit<PortfolioPosition, 'id'>
): Promise<PortfolioPosition> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<PortfolioPosition> | ApiErrorResponse
  >('/positions', position);
  return assertSuccess(data);
}

export async function deletePortfolioPosition(positionId: string): Promise<void> {
  const { data } = await portfolioApiClient.delete<ApiSuccessResponse<null> | ApiErrorResponse>(
    `/positions/${positionId}`
  );
  assertSuccess(data);
}
