export interface PortfolioPosition {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  entryDate: string; // ISO YYYY-MM-DD
  currentPrice: number;
  currency: 'USD' | 'EUR';
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

export interface PortfolioState {
  positions: PortfolioPosition[];
  stats: PortfolioStats;
  sectorAllocations: SectorAllocation[];
  watchlist: WatchlistItem[];
  news: NewsItem[];
  equityHistory: EquityDataPoint[];
  isLoading: boolean;
  error: string | null;
}
