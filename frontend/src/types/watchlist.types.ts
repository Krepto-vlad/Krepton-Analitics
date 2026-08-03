export interface StoredWatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  createdAt: string;
}

export interface AddWatchlistPayload {
  ticker: string;
  companyName: string;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  currency: string;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  logoUrl: string | null;
}

export interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}
