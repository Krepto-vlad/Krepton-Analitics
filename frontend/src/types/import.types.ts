export type SupportedBrokerId = 'GENERIC' | 'SNAPTRADE';

export type TradeColumnKey = 'date' | 'ticker' | 'side' | 'quantity' | 'price' | 'currency';

export type BrokerParserMode = 'heuristic' | 'ai_schema' | 'broker_sync';

export interface ColumnMapping {
  headerRowIndex: number;
  columns: Record<Exclude<TradeColumnKey, 'currency'>, number> & { currency: number | null };
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
