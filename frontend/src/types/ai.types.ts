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
  marketBenchmark?: NewsSummaryMarketBenchmark | null;
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

export interface AlignmentExplanationDrift {
  title: string;
  explanation: string;
}

export type FalseDiversificationRiskLevel = 'none' | 'low' | 'moderate' | 'high';

export interface AlignmentFalseDiversificationInsight {
  riskLevel: FalseDiversificationRiskLevel;
  title: string;
  explanation: string;
}

export interface AlignmentExplanationResponse {
  explanationDate: string;
  strategyId: string;
  strategyName: string;
  alignmentScore: number;
  overview: string;
  keyDrifts: AlignmentExplanationDrift[];
  falseDiversification?: AlignmentFalseDiversificationInsight;
  whatItMeans: string;
  disclaimer: string;
  fromCache: boolean;
  quota: AiQuotaStatus;
}

export type TickerChatRole = 'user' | 'assistant';

export interface TickerChatHistoryMessage {
  role: TickerChatRole;
  content: string;
}

export interface GenerateTickerChatPayload {
  ticker: string;
  message: string;
  history: TickerChatHistoryMessage[];
  includeHoldingContext: boolean;
}

export interface TickerChatFactCheck {
  quoteVerified: boolean;
  holdingVerified: boolean;
  corrected: boolean;
  livePrice: number | null;
  currency: string | null;
  changePercent: number | null;
  shares: number | null;
  avgBuyPrice: number | null;
}

export interface TickerChatResponse {
  ticker: string;
  reply: string;
  disclaimer: string;
  quota: AiQuotaStatus;
  sources: NewsSummarySource[];
  groundingEnabled: boolean;
  factCheck: TickerChatFactCheck;
}

export interface TickerChatUiMessage {
  id: string;
  role: TickerChatRole;
  content: string;
  groundingEnabled?: boolean;
  factCheck?: TickerChatFactCheck;
}
