export type { AiFeatureId } from '../constants.js';

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

export type FalseDiversificationRiskLevel = 'none' | 'low' | 'moderate' | 'high';

export interface AlignmentFalseDiversificationInsight {
  riskLevel: FalseDiversificationRiskLevel;
  title: string;
  explanation: string;
}

export interface AlignmentExplanationPayload {
  overview: string;
  keyDrifts: AlignmentExplanationDrift[];
  falseDiversification?: AlignmentFalseDiversificationInsight;
  whatItMeans: string;
}

export interface AlignmentExplanationResponse {
  explanationDate: string;
  strategyId: string;
  strategyName: string;
  alignmentScore: number;
  overview: string;
  keyDrifts: AlignmentExplanationDrift[];
  falseDiversification: AlignmentFalseDiversificationInsight;
  whatItMeans: string;
  disclaimer: string;
  fromCache: boolean;
  quota: AiQuotaStatus;
}

export interface AlignmentPromptHolding {
  ticker: string;
  bucketLabel: string;
  marketValue: number;
  weightPercent: number;
  sector: string | null;
}

export interface AlignmentFalseDiversificationHints {
  overlappingClusters: Array<{
    label: string;
    tickersPresent: string[];
    note: string;
  }>;
  topSectors: Array<{
    sector: string;
    weightPercent: number;
  }>;
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
  topHoldings: AlignmentPromptHolding[];
  falseDiversificationHints: AlignmentFalseDiversificationHints;
}

export type TickerChatRole = 'user' | 'assistant';

export interface TickerChatHistoryMessage {
  role: TickerChatRole;
  content: string;
}

export interface TickerChatHoldingContext {
  shares: number;
  avgBuyPrice: number;
  currency: string;
  unrealizedPnlPercent: number;
}

export interface TickerChatPromptContext {
  ticker: string;
  companyName: string;
  currency: string;
  price: number;
  changePercent: number;
  marketState: string | null;
  exchange: string | null;
  holding: TickerChatHoldingContext | null;
  includeHoldingContext: boolean;
  history: TickerChatHistoryMessage[];
  userMessage: string;
  /** Verified text for the screen the user is looking at. Background only. */
  screenContextText?: string | null;
  /** Fresh quotes for companies named in this message. The subject of the answer. */
  questionContextText?: string | null;
}

export interface TickerChatCompareScreenRequest {
  kind: 'compare';
  tickers: string[];
}

export interface TickerChatRebalancingScreenRequest {
  kind: 'rebalancing';
  displayCurrency?: string;
}

export interface TickerChatMoversScreenRequest {
  kind: 'movers';
}

export interface TickerChatBacktestAllocationRequest {
  ticker: string;
  weightPercent: number;
}

export interface TickerChatBacktestScreenRequest {
  kind: 'backtest';
  period: string;
  amount: number;
  displayCurrency?: string;
  allocations: TickerChatBacktestAllocationRequest[];
}

export interface TickerChatDividendsScreenRequest {
  kind: 'dividends';
  displayCurrency?: string;
}

export interface TickerChatTickerScreenRequest {
  kind: 'ticker';
  period: string;
}

export interface TickerChatPairScreenRequest {
  kind: 'pair';
  otherTicker: string;
  period: string;
  topic: string;
}

export interface TickerChatPortfolioScreenRequest {
  kind: 'portfolio';
  displayCurrency?: string;
}

export interface TickerChatNewsScreenRequest {
  kind: 'news';
}

export interface TickerChatWatchlistScreenRequest {
  kind: 'watchlist';
}

export type TickerChatScreenRequest =
  | TickerChatCompareScreenRequest
  | TickerChatRebalancingScreenRequest
  | TickerChatMoversScreenRequest
  | TickerChatBacktestScreenRequest
  | TickerChatDividendsScreenRequest
  | TickerChatTickerScreenRequest
  | TickerChatPairScreenRequest
  | TickerChatPortfolioScreenRequest
  | TickerChatNewsScreenRequest
  | TickerChatWatchlistScreenRequest;

export interface TickerChatCompareBarRow {
  ticker: string;
  name: string;
  value: number | null;
}

export interface TickerChatCompareBarsBlock {
  kind: 'compare-bars';
  metricKey: 'peRatio' | 'revenueGrowth' | 'profitMargin';
  title: string;
  unit: 'multiple' | 'percent';
  rows: TickerChatCompareBarRow[];
}

export interface TickerChatAllocationBarRow {
  label: string;
  currentPercent: number;
  targetPercent: number;
}

export interface TickerChatAllocationBarsBlock {
  kind: 'allocation-bars';
  title: string;
  rows: TickerChatAllocationBarRow[];
}

export interface TickerChatMoverBarRow {
  ticker: string;
  name: string;
  changePercent: number;
}

export interface TickerChatMoverBarsBlock {
  kind: 'mover-bars';
  title: string;
  side: 'gainers' | 'losers';
  rows: TickerChatMoverBarRow[];
}

export interface TickerChatBacktestBarRow {
  label: string;
  returnPercent: number;
}

export interface TickerChatBacktestBarsBlock {
  kind: 'backtest-bars';
  title: string;
  rows: TickerChatBacktestBarRow[];
}

export interface TickerChatPayoutBarRow {
  label: string;
  amount: number;
}

export interface TickerChatPayoutBarsBlock {
  kind: 'payout-bars';
  title: string;
  currency: string;
  rows: TickerChatPayoutBarRow[];
}

export interface TickerChatWeightBarRow {
  label: string;
  weightPercent: number;
}

export interface TickerChatWeightBarsBlock {
  kind: 'weight-bars';
  title: string;
  rows: TickerChatWeightBarRow[];
}

export interface TickerChatHeadlineRow {
  ticker: string;
  headline: string;
}

export interface TickerChatHeadlineListBlock {
  kind: 'headline-list';
  title: string;
  rows: TickerChatHeadlineRow[];
}

export type TickerChatDisplayBlock =
  | TickerChatCompareBarsBlock
  | TickerChatAllocationBarsBlock
  | TickerChatMoverBarsBlock
  | TickerChatBacktestBarsBlock
  | TickerChatPayoutBarsBlock
  | TickerChatWeightBarsBlock
  | TickerChatHeadlineListBlock;

export interface TickerChatGenerationResult {
  reply: string;
  sources: NewsSummarySource[];
  groundingEnabled: boolean;
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

export interface GenerateTickerChatDto {
  ticker?: string;
  message: string;
  history?: TickerChatHistoryMessage[];
  includeHoldingContext?: boolean;
  screenContext?: TickerChatScreenRequest;
}

export interface TickerChatResponse {
  ticker: string;
  reply: string;
  disclaimer: string;
  quota: AiQuotaStatus;
  sources: NewsSummarySource[];
  groundingEnabled: boolean;
  factCheck: TickerChatFactCheck;
  displayBlocks: TickerChatDisplayBlock[];
  /** Ticker to chart in the reply when that chart is not already on the open page. */
  chartTicker: string | null;
}
