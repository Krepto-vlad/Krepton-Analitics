import type { PortfolioTransaction } from './portfolio.types';

export interface PortfolioExportPosition {
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

export interface PortfolioExportWatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  createdAt: string;
}

export interface PortfolioExportBrokerageConnection {
  brokerageName: string;
  brokerageSlug: string;
  connectedAt: string | null;
  disabled: boolean;
  accessType: 'read' | 'trade';
}

export interface PortfolioExportTransaction extends PortfolioTransaction {
  source: 'unknown' | 'manual' | 'import' | 'snaptrade';
}

export interface PortfolioDataExport {
  schemaVersion: number;
  exportedAt: string;
  account: {
    email: string;
    memberSince: string;
  };
  positions: PortfolioExportPosition[];
  transactions: PortfolioExportTransaction[];
  watchlist: PortfolioExportWatchlistItem[];
  rebalancing: {
    strategyId: string;
    customBaseStrategyId: string | null;
    customAllocations: Record<string, number> | null;
    includePermanentCash?: boolean;
  };
  brokerageConnections: PortfolioExportBrokerageConnection[];
}

export interface PortfolioExportXlsxFile {
  format: 'xlsx';
  fileName: string;
  contentType: string;
  contentBase64: string;
}
