import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  confirmBrokerSyncHoldings,
  createBrokerSyncPortalUrl,
  parseSnaptradeBroker,
  previewBrokerSyncHoldings,
} from '../services/brokerSyncService.js';
import type {
  ConfirmImportDto,
  ImportConfirmResponse,
  ImportPreviewResponse,
} from '../types/import.types.js';
import type { SnaptradeConnectDto, SnaptradeConnectResult } from '../types/snaptrade.types.js';
import type { ApiResponse } from '../types/stock.types.js';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Unauthorized');
  }

  return req.userId;
}

export async function connectBrokerSync(
  req: Request,
  res: Response<ApiResponse<SnaptradeConnectResult>>
): Promise<void> {
  const dto = req.body as SnaptradeConnectDto;
  const broker = parseSnaptradeBroker(dto?.broker);
  const result = await createBrokerSyncPortalUrl(requireUserId(req), broker);
  res.json({ success: true, data: result });
}

export async function previewBrokerSync(
  req: Request,
  res: Response<ApiResponse<ImportPreviewResponse>>
): Promise<void> {
  const preview = await previewBrokerSyncHoldings(requireUserId(req));
  res.json({ success: true, data: preview });
}

export async function confirmBrokerSync(
  req: Request,
  res: Response<ApiResponse<ImportConfirmResponse>>
): Promise<void> {
  const dto = req.body as ConfirmImportDto;
  if (!dto?.importId || dto.importId.trim().length === 0) {
    throw new AppError(400, 'importId is required');
  }

  const result = await confirmBrokerSyncHoldings(requireUserId(req), dto.importId.trim());
  res.json({ success: true, data: result });
}
