import { createApiClient, assertSuccess } from './apiClient';
import { API_BASE_URL } from '../constants';
import type { SnaptradeConnectableBrokerId } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { ImportConfirmResponse, ImportPreviewResponse } from '../types/import.types';

const brokerSyncApiClient = createApiClient(`${API_BASE_URL}/api/portfolio`);

export interface BrokerSyncConnectResult {
  redirectUrl: string;
}

export async function connectBrokerSync(
  broker: SnaptradeConnectableBrokerId
): Promise<BrokerSyncConnectResult> {
  const { data } = await brokerSyncApiClient.post<
    ApiSuccessResponse<BrokerSyncConnectResult> | ApiErrorResponse
  >('/broker-sync/connect', { broker });

  return assertSuccess(data);
}

export async function previewBrokerSync(): Promise<ImportPreviewResponse> {
  const { data } = await brokerSyncApiClient.post<
    ApiSuccessResponse<ImportPreviewResponse> | ApiErrorResponse
  >('/broker-sync/preview');

  return assertSuccess(data);
}

export async function confirmBrokerSync(importId: string): Promise<ImportConfirmResponse> {
  const { data } = await brokerSyncApiClient.post<
    ApiSuccessResponse<ImportConfirmResponse> | ApiErrorResponse
  >('/broker-sync/confirm', { importId });

  return assertSuccess(data);
}
