import type { TransactionLedgerSource } from '../constants.js';
import type { PortfolioExportBrokerageConnection } from './snaptrade.types.js';

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface PortfolioAccountRow {
  id: string;
  owner_token: string;
  rebalancing_strategy_id?: string;
  rebalancing_custom_allocations?: Record<string, number> | null;
  rebalancing_custom_base_strategy_id?: string | null;
  rebalancing_include_permanent_cash?: boolean;
  created_at: Date;
}

export interface PositionRow {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string;
  shares: string; // pg returns numeric as string
  avg_buy_price: string;
  currency: string;
  sector: string | null;
  entry_date: string | null; // YYYY-MM-DD
  created_at: Date;
  updated_at: Date;
}

export interface TransactionRow {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string;
  shares: string;
  price_per_share: string;
  currency: string;
  transaction_date: string | null;
  transaction_type: 'BUY' | 'SELL';
  source?: string;
  created_at: Date;
}

export interface ClosePositionDto {
  shares: number;
  pricePerShare: number;
  currency: 'USD' | 'EUR';
  saleDate?: string;
}

// ─── API DTOs ─────────────────────────────────────────────────────────────────

export interface AddPositionDto {
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  currency: 'USD' | 'EUR';
  entryDate?: string; // YYYY-MM-DD
  sector?: string;
}

export interface UpdatePositionDto {
  shares?: number;
  avgBuyPrice?: number;
  currency?: 'USD' | 'EUR';
  entryDate?: string;
}

// ─── Equity history ───────────────────────────────────────────────────────────

export interface EquityPoint {
  time: string; // YYYY-MM-DD
  value: number;
  displayCurrency?: 'USD' | 'EUR';
  displayValue?: number;
}

// ─── API response shape ───────────────────────────────────────────────────────

export interface PositionResponse {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  currency: string;
  sector: string | null;
  entryDate: string | null;
  /** False for crypto, options, currencies, indexes, and futures. They stay stored, outside analysis. */
  includedInAnalysis: boolean;
  createdAt: string;
  updatedAt: string;
  displayCurrency?: 'USD' | 'EUR';
  displayAvgBuyPrice?: number;
  displayFxRate?: number;
  displayFxRateDate?: string;
}

export interface TransactionResponse {
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

export interface PortfolioExportTransaction extends TransactionResponse {
  source: TransactionLedgerSource;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface InvestmentSummaryResponse {
  /** Gross capital deployed — sum of all BUY transaction totals. */
  totalInvested: number;
  /** Gross proceeds from sales — sum of all SELL transaction totals. */
  totalWithdrawn: number;
  displayCurrency?: 'USD' | 'EUR';
  displayTotalInvested?: number;
  displayTotalWithdrawn?: number;
}

/** Portable portfolio snapshot — never includes owner_token, passwords, or SnapTrade secrets. */
export interface PortfolioDataExport {
  schemaVersion: number;
  exportedAt: string;
  account: {
    email: string;
    memberSince: string;
  };
  positions: PositionResponse[];
  transactions: PortfolioExportTransaction[];
  watchlist: Array<{
    id: string;
    ticker: string;
    companyName: string;
    createdAt: string;
  }>;
  rebalancing: {
    strategyId: string;
    customBaseStrategyId: string | null;
    customAllocations: Record<string, number> | null;
    includePermanentCash: boolean;
  };
  brokerageConnections: PortfolioExportBrokerageConnection[];
}

export interface PortfolioExportXlsxFile {
  format: 'xlsx';
  fileName: string;
  contentType: string;
  contentBase64: string;
}
