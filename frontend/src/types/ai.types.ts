export type NewsSummarySentiment = 'bullish' | 'neutral' | 'bearish';

export interface NewsSummaryHoldingInsight {
  ticker: string;
  companyName: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  sentiment: NewsSummarySentiment;
  summary: string;
  highlights: string[];
  shares?: number;
  avgBuyPrice?: number;
  unrealizedPnlPercent?: number;
}

export interface NewsSummaryMarketDriver {
  title: string;
  explanation: string;
}

export interface NewsSummarySource {
  title: string;
  url: string;
}

export interface AiQuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface NewsSummaryResponse {
  summaryDate: string;
  tickers: string[];
  holdingInsights: NewsSummaryHoldingInsight[];
  marketDrivers: NewsSummaryMarketDriver[];
  sources: NewsSummarySource[];
  disclaimer: string;
  fromCache: boolean;
  quota: AiQuotaStatus;
  groundingEnabled: boolean;
  includePortfolioContext: boolean;
}

export interface GenerateNewsSummaryPayload {
  tickers: string[];
  includePortfolioContext?: boolean;
}
