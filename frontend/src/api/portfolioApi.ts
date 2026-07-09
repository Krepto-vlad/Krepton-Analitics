import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';

// ─── Types matching backend PositionResponse ──────────────────────────────────

export interface StoredPosition {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  currency: string;
  sector: string | null;
  entryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddPositionPayload {
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  currency: 'USD' | 'EUR';
  entryDate?: string;
  sector?: string;
}

export interface UpdatePositionPayload {
  shares?: number;
  avgBuyPrice?: number;
  currency?: 'USD' | 'EUR';
  entryDate?: string;
}

export interface ClosePositionPayload {
  shares: number;
  pricePerShare: number;
  currency: 'USD' | 'EUR';
  saleDate?: string;
}

export interface ClosePositionResponse {
  success: boolean;
  data: StoredPosition | null;
  closed: boolean;
}

export interface PortfolioTransaction {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  currency: string;
  transactionDate: string | null;
  transactionType: 'BUY' | 'SELL';
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalWithdrawn: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

const portfolioApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/portfolio`,
  withCredentials: true,
});

function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) throw new Error((data as ApiErrorResponse).error ?? 'Unknown error');
  return (data as ApiSuccessResponse<T>).data;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function fetchPortfolioPositions(): Promise<StoredPosition[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<StoredPosition[]> | ApiErrorResponse
  >('/');
  return assertSuccess(data);
}

export async function fetchPortfolioPositionsPage(
  limit: number,
  offset: number
): Promise<PaginatedResult<StoredPosition>> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PaginatedResult<StoredPosition>> | ApiErrorResponse
  >('/', { params: { limit, offset } });
  return assertSuccess(data);
}

export async function fetchPortfolioTransactionsPage(
  limit: number,
  offset: number
): Promise<PaginatedResult<PortfolioTransaction>> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PaginatedResult<PortfolioTransaction>> | ApiErrorResponse
  >('/transactions', { params: { limit, offset } });
  return assertSuccess(data);
}

export async function fetchBuyTransactionsForTicker(
  ticker: string
): Promise<PortfolioTransaction[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PortfolioTransaction[]> | ApiErrorResponse
  >(`/buys/${encodeURIComponent(ticker)}`);
  return assertSuccess(data);
}

export async function deleteBuyTransaction(transactionId: string): Promise<void> {
  await portfolioApiClient.delete(`/transactions/${transactionId}`);
}

export async function createPortfolioPosition(
  payload: AddPositionPayload
): Promise<StoredPosition> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<StoredPosition> | ApiErrorResponse
  >('/', payload);
  return assertSuccess(data);
}

export async function updatePortfolioPosition(
  positionId: string,
  payload: UpdatePositionPayload
): Promise<StoredPosition> {
  const { data } = await portfolioApiClient.patch<
    ApiSuccessResponse<StoredPosition> | ApiErrorResponse
  >(`/${positionId}`, payload);
  return assertSuccess(data);
}

export async function deletePortfolioPosition(positionId: string): Promise<void> {
  // Backend returns 204 No Content — no body to parse
  await portfolioApiClient.delete(`/${positionId}`);
}

export async function fetchPortfolioEquityHistory(): Promise<{ time: string; value: number }[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<{ time: string; value: number }[]> | ApiErrorResponse
  >('/equity-history');
  return assertSuccess(data);
}

export async function fetchInvestmentSummary(): Promise<InvestmentSummary> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<InvestmentSummary> | ApiErrorResponse
  >('/investment-summary');
  return assertSuccess(data);
}

export async function closePortfolioPosition(
  positionId: string,
  payload: ClosePositionPayload
): Promise<ClosePositionResponse> {
  const { data } = await portfolioApiClient.post<ClosePositionResponse>(
    `/${positionId}/close`,
    payload
  );
  return data;
}
