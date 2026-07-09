export interface PortfolioPosition {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  entryDate: string | null;
  // Fetched live from /api/stocks/quote/:ticker after loading stored positions.
  // Falls back to avgBuyPrice if the quote request fails.
  currentPrice: number;
  currency: string;
  sector: string | null;
}

export interface PortfolioStats {
  totalValue: number;
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dayPnl: number;
  totalPnlPercent: number;
  dayPnlPercent: number;
}

export interface SectorAllocation {
  sector: string;
  percentage: number;
  color: string;
}

export interface WatchlistItem {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  alertType: 'BUY' | 'SELL' | null;
}

export interface NewsItem {
  id: string;
  tickers: string[];
  source: string;
  timeAgo: string;
  headline: string;
}

export interface EquityDataPoint {
  time: string; // YYYY-MM-DD (lightweight-charts format)
  value: number;
}

export interface PortfolioTransaction {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  currency: string;
  transactionDate: string | null;
  transactionType: 'BUY' | 'SELL';
  createdAt: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalWithdrawn: number;
}

export interface PortfolioState {
  positions: PortfolioPosition[];
  positionsTotal: number;
  positionsHasMore: boolean;
  isLoadingMorePositions: boolean;
  summaryPositions: PortfolioPosition[];
  investmentSummary: InvestmentSummary;
  transactions: PortfolioTransaction[];
  transactionsTotal: number;
  transactionsHasMore: boolean;
  isLoadingTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  stats: PortfolioStats;
  sectorAllocations: SectorAllocation[];
  watchlist: WatchlistItem[];
  news: NewsItem[];
  equityHistory: EquityDataPoint[];
  isLoading: boolean;
  error: string | null;
}
