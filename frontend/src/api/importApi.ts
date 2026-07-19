import axios from 'axios';
import { API_BASE_URL } from '../constants';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/stock.types';
import type { ImportConfirmResponse, ImportPreviewResponse } from '../types/import.types';

const importApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/portfolio`,
  withCredentials: true,
});

function assertSuccess<T>(data: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!data.success) {
    throw new Error(data.error ?? 'Unknown error');
  }
  return data.data;
}

export async function previewBrokerImport(
  broker: string,
  file: File
): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('broker', broker);
  formData.append('file', file);

  const { data } = await importApiClient.post<
    ApiSuccessResponse<ImportPreviewResponse> | ApiErrorResponse
  >('/import/preview', formData);

  return assertSuccess(data);
}

export async function confirmBrokerImport(importId: string): Promise<ImportConfirmResponse> {
  const { data } = await importApiClient.post<
    ApiSuccessResponse<ImportConfirmResponse> | ApiErrorResponse
  >('/import/confirm', { importId });

  return assertSuccess(data);
}
