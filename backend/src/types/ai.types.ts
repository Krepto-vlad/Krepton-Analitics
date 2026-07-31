export type AiFeatureId = 'news_summary' | 'explain_alignment';

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

export interface NewsSummaryMarketBenchmark {
  ticker: string;
  label: string;
  price: number;
  changePercent: number;
}

export interface NewsSummarySource {
  title: string;
  url: string;
}

export interface NewsSummaryPayload {
  holdingInsights: NewsSummaryHoldingInsight[];
  marketDrivers: NewsSummaryMarketDriver[];
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
  marketBenchmark: NewsSummaryMarketBenchmark | null;
  sources: NewsSummarySource[];
  disclaimer: string;
  fromCache: boolean;
  quota: AiQuotaStatus;
  groundingEnabled: boolean;
  includePortfolioContext: boolean;
}

export interface GenerateNewsSummaryDto {
  tickers: string[];
  includePortfolioContext?: boolean;
}

export interface BriefingHoldingContext {
  ticker: string;
  companyName: string;
  sector: string | null;
  price: number;
  changePercent: number;
  currency: string;
  shares?: number;
  avgBuyPrice?: number;
  unrealizedPnlPercent?: number;
}

export interface BriefingMacroSnapshot {
  ticker: string;
  label: string;
  price: number;
  changePercent: number;
}

export interface BriefingPromptContext {
  summaryDate: string;
  holdings: BriefingHoldingContext[];
  macroSnapshots: BriefingMacroSnapshot[];
  headlineLines: string[];
  includePortfolioContext: boolean;
  groundingEnabled: boolean;
}

export interface AiNewsSummaryRow {
  id: string;
  user_id: string;
  tickers_key: string;
  summary_date: string;
  tickers: string[];
  summary_payload: NewsSummaryPayload;
  created_at: Date;
}

export interface AlignmentExplanationDrift {
  title: string;
  explanation: string;
}

export interface AlignmentExplanationPayload {
  overview: string;
  keyDrifts: AlignmentExplanationDrift[];
  whatItMeans: string;
}

export interface AlignmentExplanationResponse {
  explanationDate: string;
  strategyId: string;
  strategyName: string;
  alignmentScore: number;
  overview: string;
  keyDrifts: AlignmentExplanationDrift[];
  whatItMeans: string;
  disclaimer: string;
  fromCache: boolean;
  quota: AiQuotaStatus;
}

export interface AlignmentPromptContext {
  explanationDate: string;
  strategyName: string;
  strategyPhilosophy: string;
  investmentHorizon: string;
  alignmentScore: number;
  totalPortfolioValue: number;
  displayCurrency: string;
  deviations: Array<{
    label: string;
    currentPercent: number;
    targetPercent: number;
    deviationPercent: number;
    status: 'overweight' | 'underweight' | 'optimal';
  }>;
  topHoldings: Array<{
    ticker: string;
    bucketLabel: string;
    marketValue: number;
  }>;
}
