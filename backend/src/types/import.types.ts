import type { SupportedBrokerId } from '../constants.js';

export type TradeColumnKey = 'date' | 'ticker' | 'side' | 'quantity' | 'price' | 'currency';

export const TRADE_COLUMN_KEYS: TradeColumnKey[] = [
  'date',
  'ticker',
  'side',
  'quantity',
  'price',
  'currency',
];

/** Currency may be absent; other trade fields are required for mapping. */
export const REQUIRED_TRADE_COLUMN_KEYS: Array<Exclude<TradeColumnKey, 'currency'>> = [
  'date',
  'ticker',
  'side',
  'quantity',
  'price',
];

export type BrokerParserMode = 'heuristic' | 'ai_schema';

export interface ColumnMapping {
  headerRowIndex: number;
  /** `currency` is null when the statement has no currency column. */
  columns: Record<Exclude<TradeColumnKey, 'currency'>, number> & { currency: number | null };
}

export interface BrokerParseMeta {
  mode: BrokerParserMode;
  confidence: number;
  columnMapping: ColumnMapping | null;
  headerFingerprint: string | null;
  warning: string | null;
}

export interface BrokerParseResult {
  trades: NormalizedTrade[];
  skipped: SkippedImportRow[];
  meta: BrokerParseMeta;
}

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
  parserMode: BrokerParserMode;
  confidence: number;
  warning: string | null;
  columnMapping: ColumnMapping | null;
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
