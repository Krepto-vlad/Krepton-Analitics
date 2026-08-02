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

export interface PortfolioDataExport {
  schemaVersion: number;
  exportedAt: string;
  account: {
    email: string;
    memberSince: string;
  };
  positions: PortfolioExportPosition[];
  transactions: PortfolioTransaction[];
  watchlist: PortfolioExportWatchlistItem[];
  rebalancing: {
    strategyId: string;
    customBaseStrategyId: string | null;
    customAllocations: Record<string, number> | null;
  };
}

export interface PortfolioExportXlsxFile {
  format: 'xlsx';
  fileName: string;
  contentType: string;
  contentBase64: string;
}
