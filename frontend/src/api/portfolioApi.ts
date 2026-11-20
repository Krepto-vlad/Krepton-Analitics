import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL, type PortfolioExportFormat } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { StepUpCredentials } from '../types/auth.types';
import type { PortfolioDataExport, PortfolioExportXlsxFile } from '../types/portfolioExport.types';
import { decodeBase64ToBlob, downloadBlobFile, downloadJsonFile } from '../utils/downloadFile';

export type { PortfolioDataExport, PortfolioExportXlsxFile } from '../types/portfolioExport.types';
import type { NewsItem } from '../types/portfolio.types';
import type { DividendCalendarResponse } from '../types/dividend.types';
import type {
  RebalancingAnalysisResponse,
  RebalancingStrategyOption,
  UpdateRebalancingStrategyPayload,
} from '../types/rebalancing.types';
import type {
  AiQuotaStatus,
  AlignmentExplanationResponse,
  GenerateNewsSummaryPayload,
  GenerateTickerChatPayload,
  NewsSummaryResponse,
  TickerChatResponse,
} from '../types/ai.types';

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
  /** False for crypto, options, currencies, indexes, and futures. Missing means included. */
  includedInAnalysis?: boolean;
  createdAt: string;
  updatedAt: string;
  displayCurrency?: 'USD' | 'EUR';
  displayAvgBuyPrice?: number;
  displayFxRate?: number;
  displayFxRateDate?: string;
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
  displayCurrency?: 'USD' | 'EUR';
  displayPricePerShare?: number;
  displayTotalAmount?: number;
  displayFxRate?: number;
  displayFxRateDate?: string;
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
  displayCurrency?: 'USD' | 'EUR';
  displayTotalInvested?: number;
  displayTotalWithdrawn?: number;
}

export interface EquityHistoryPoint {
  time: string;
  value: number;
  displayCurrency?: 'USD' | 'EUR';
  displayValue?: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

const portfolioApiClient = createApiClient(`${API_BASE_URL}/api/portfolio`);

// ─── Endpoints ────────────────────────────────────────────────────────────────

import type { Currency } from '../constants';

function withDisplayCurrency(displayCurrency?: Currency): Record<string, Currency> | undefined {
  return displayCurrency ? { displayCurrency } : undefined;
}

export async function fetchPortfolioPositions(
  displayCurrency?: Currency
): Promise<StoredPosition[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<StoredPosition[]> | ApiErrorResponse
  >('/', { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchPortfolioPositionsPage(
  limit: number,
  offset: number,
  displayCurrency?: Currency
): Promise<PaginatedResult<StoredPosition>> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PaginatedResult<StoredPosition>> | ApiErrorResponse
  >('/', { params: { limit, offset, ...withDisplayCurrency(displayCurrency) } });
  return assertSuccess(data);
}

export async function fetchPortfolioTransactionsPage(
  limit: number,
  offset: number,
  displayCurrency?: Currency
): Promise<PaginatedResult<PortfolioTransaction>> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PaginatedResult<PortfolioTransaction>> | ApiErrorResponse
  >('/transactions', { params: { limit, offset, ...withDisplayCurrency(displayCurrency) } });
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

export async function fetchTickerTransactions(ticker: string): Promise<PortfolioTransaction[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<PortfolioTransaction[]> | ApiErrorResponse
  >(`/trades/${encodeURIComponent(ticker)}`);
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

export async function fetchPortfolioEquityHistory(
  displayCurrency?: Currency
): Promise<EquityHistoryPoint[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<EquityHistoryPoint[]> | ApiErrorResponse
  >('/equity-history', { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchInvestmentSummary(
  displayCurrency?: Currency
): Promise<InvestmentSummary> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<InvestmentSummary> | ApiErrorResponse
  >('/investment-summary', { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchPortfolioNews(): Promise<NewsItem[]> {
  const { data } = await portfolioApiClient.get<ApiSuccessResponse<NewsItem[]> | ApiErrorResponse>(
    '/news'
  );
  return assertSuccess(data);
}

export async function fetchNewsSummaryQuota(): Promise<AiQuotaStatus> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<AiQuotaStatus> | ApiErrorResponse
  >('/news/summary/quota');
  return assertSuccess(data);
}

export async function generateNewsSummary(
  payload: GenerateNewsSummaryPayload
): Promise<NewsSummaryResponse> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<NewsSummaryResponse> | ApiErrorResponse
  >('/news/summary', payload);
  return assertSuccess(data);
}

export async function fetchPortfolioDividends(
  displayCurrency?: Currency
): Promise<DividendCalendarResponse> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<DividendCalendarResponse> | ApiErrorResponse
  >('/dividends', { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchRebalancingStrategies(): Promise<RebalancingStrategyOption[]> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<RebalancingStrategyOption[]> | ApiErrorResponse
  >('/rebalancing/strategies');
  return assertSuccess(data);
}

export async function fetchPortfolioRebalancing(
  displayCurrency?: Currency
): Promise<RebalancingAnalysisResponse> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<RebalancingAnalysisResponse> | ApiErrorResponse
  >('/rebalancing', { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchAlignmentExplanationQuota(): Promise<AiQuotaStatus> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<AiQuotaStatus> | ApiErrorResponse
  >('/rebalancing/explain/quota');
  return assertSuccess(data);
}

export async function generateAlignmentExplanation(
  displayCurrency?: Currency
): Promise<AlignmentExplanationResponse> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<AlignmentExplanationResponse> | ApiErrorResponse
  >('/rebalancing/explain', undefined, { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export async function fetchTickerChatQuota(): Promise<AiQuotaStatus> {
  const { data } = await portfolioApiClient.get<
    ApiSuccessResponse<AiQuotaStatus> | ApiErrorResponse
  >('/ticker-chat/quota');
  return assertSuccess(data);
}

export async function sendTickerChatMessage(
  payload: GenerateTickerChatPayload
): Promise<TickerChatResponse> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<TickerChatResponse> | ApiErrorResponse
  >('/ticker-chat', payload);
  return assertSuccess(data);
}

export async function updatePortfolioRebalancingStrategy(
  payload: UpdateRebalancingStrategyPayload,
  displayCurrency?: Currency
): Promise<RebalancingAnalysisResponse> {
  const { data } = await portfolioApiClient.put<
    ApiSuccessResponse<RebalancingAnalysisResponse> | ApiErrorResponse
  >('/rebalancing/strategy', payload, { params: withDisplayCurrency(displayCurrency) });
  return assertSuccess(data);
}

export interface DeletePortfolioDataResult {
  deletedTransactions: number;
  deletedPositions: number;
  deletedWatchlistItems: number;
}

export async function deletePortfolioData(confirm: string): Promise<DeletePortfolioDataResult> {
  const { data } = await portfolioApiClient.delete<
    ApiSuccessResponse<DeletePortfolioDataResult> | ApiErrorResponse
  >('/data', { data: { confirm } });
  return assertSuccess(data);
}

export async function exportPortfolioData(
  credentials: StepUpCredentials,
  format: PortfolioExportFormat
): Promise<{ fileName: string }> {
  const requestBody = { ...credentials, format };

  if (format === 'json') {
    const { data } = await portfolioApiClient.post<
      ApiSuccessResponse<PortfolioDataExport> | ApiErrorResponse
    >('/export', requestBody);
    const exportPayload = assertSuccess(data);
    const dateStamp = exportPayload.exportedAt.slice(0, 10);
    const fileName = `krepton-portfolio-export-${dateStamp}.json`;
    downloadJsonFile(fileName, exportPayload);
    return { fileName };
  }

  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<PortfolioExportXlsxFile> | ApiErrorResponse
  >('/export', requestBody);
  const exportFile = assertSuccess(data);
  downloadBlobFile(
    exportFile.fileName,
    decodeBase64ToBlob(exportFile.contentBase64, exportFile.contentType)
  );
  return { fileName: exportFile.fileName };
}

export async function closePortfolioPosition(
  positionId: string,
  payload: ClosePositionPayload
): Promise<ClosePositionResponse> {
  const { data } = await portfolioApiClient.post<
    ApiSuccessResponse<StoredPosition | null> | ApiErrorResponse
  >(`/${positionId}/close`, payload);

  const position = assertSuccess(data);

  return {
    success: true,
    data: position,
    closed: position === null,
  };
}
