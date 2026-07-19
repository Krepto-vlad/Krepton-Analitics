import type { SupportedBrokerId } from '../constants.js';

export interface NormalizedTrade {
  rowNumber: number;
  ticker: string;
  companyName: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  pricePerShare: number;
  currency: string;
  transactionDate: string;
  sourceType: string;
  sourceRowHash: string;
}

export interface SkippedImportRow {
  rowNumber: number;
  sourceType: string;
  reason: string;
}

export interface ImportPreviewSummary {
  totalRows: number;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  skippedCount: number;
  duplicateCount: number;
}

export interface ImportPreviewResponse {
  importId: string;
  broker: SupportedBrokerId;
  trades: NormalizedTrade[];
  skipped: SkippedImportRow[];
  summary: ImportPreviewSummary;
}

export interface ImportConfirmResponse {
  importedCount: number;
  skippedDuplicateCount: number;
  affectedTickers: string[];
}

export interface ConfirmImportDto {
  importId: string;
}
