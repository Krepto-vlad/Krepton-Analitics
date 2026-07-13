export interface WatchlistItemRow {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string;
  created_at: Date;
}

export interface AddWatchlistItemDto {
  ticker: string;
  companyName: string;
}

export interface WatchlistItemResponse {
  id: string;
  ticker: string;
  companyName: string;
  createdAt: string;
}
