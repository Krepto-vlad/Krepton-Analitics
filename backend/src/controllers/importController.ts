import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { previewBrokerImport, confirmBrokerImport } from '../services/importService.js';
import type { ConfirmImportDto } from '../types/import.types.js';
import type { ImportPreviewResponse, ImportConfirmResponse } from '../types/import.types.js';
import type { ApiResponse } from '../types/stock.types.js';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Unauthorized');
  }
  return req.userId;
}

export async function previewImport(
  req: Request,
  res: Response<ApiResponse<ImportPreviewResponse>>
): Promise<void> {
  if (!req.file?.buffer) {
    throw new AppError(400, 'Statement file is required (.xlsx or .csv)');
  }

  const originalFilename = req.file.originalname?.trim() || 'statement.xlsx';
  const preview = await previewBrokerImport(requireUserId(req), req.file.buffer, originalFilename);
  res.json({ success: true, data: preview });
}

export async function confirmImport(
  req: Request,
  res: Response<ApiResponse<ImportConfirmResponse>>
): Promise<void> {
  const dto = req.body as ConfirmImportDto;

  if (!dto?.importId || dto.importId.trim().length === 0) {
    throw new AppError(400, 'importId is required');
  }

  const result = await confirmBrokerImport(requireUserId(req), dto.importId.trim());
  res.json({ success: true, data: result });
}
