import axios from 'axios';
import {
  AI_EXPLAIN_ALIGNMENT_MAX_OUTPUT_TOKENS,
  GEMINI_API_BASE_URL,
  GEMINI_GROUNDING_REQUEST_TIMEOUT_MS,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
  GEMINI_TEMPERATURE,
} from '../constants.js';
import { env, isGeminiConfigured, isGeminiGroundingEnabled } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  AlignmentExplanationPayload,
  AlignmentPromptContext,
  BriefingPromptContext,
  NewsSummaryHoldingInsight,
  NewsSummaryPayload,
  NewsSummarySentiment,
  NewsSummarySource,
} from '../types/ai.types.js';

const geminiClient = axios.create({
  baseURL: GEMINI_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface GeminiGroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: GeminiGroundingChunk[];
    };
  }>;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function buildHoldingsBlock(context: BriefingPromptContext): string {
  if (context.holdings.length === 0) {
    return 'No holdings provided.';
  }

  return context.holdings
    .map((holding) => {
      const priceLine = `- ${holding.companyName} (${holding.ticker}): ~${holding.currency} ${holding.price.toFixed(2)} (${formatSignedPercent(holding.changePercent)} today)`;

      if (!context.includePortfolioContext) {
        return `${priceLine}\n  Sector: ${holding.sector ?? 'Unknown'}`;
      }

      return [
        priceLine,
        `  Sector: ${holding.sector ?? 'Unknown'}`,
        `  Position: ${holding.shares ?? 0} shares @ avg ${holding.currency} ${holding.avgBuyPrice?.toFixed(2) ?? '0.00'}`,
        `  Unrealized P/L: ${formatSignedPercent(holding.unrealizedPnlPercent ?? 0)}`,
      ].join('\n');
    })
    .join('\n');
}

function buildMacroBlock(context: BriefingPromptContext): string {
  return context.macroSnapshots
    .map(
      (snapshot) =>
        `- ${snapshot.label} (${snapshot.ticker}): ${snapshot.price.toFixed(2)} (${formatSignedPercent(snapshot.changePercent)} today)`
    )
    .join('\n');
}

function buildBriefingPrompt(context: BriefingPromptContext): string {
  const headlinesBlock =
    context.headlineLines.length > 0
      ? context.headlineLines.join('\n')
      : 'No Yahoo Finance headlines were available for the selected tickers.';

  const searchInstructions = context.groundingEnabled
    ? [
        "Use Google Search to find TODAY's market news and explain TODAY's price action.",
        'Search for each selected holding and for broader market drivers (earnings, macro, sector moves).',
        'Treat the price and change data below as ground truth — do not invent prices.',
      ]
    : [
        'Use ONLY the market data and headlines provided below.',
        'Do not invent events, prices, or forecasts beyond the supplied context.',
      ];

  return [
    'You are a financial market analyst preparing a daily portfolio briefing for an investor.',
    'Write in clear English. Focus on what happened TODAY and why prices moved TODAY.',
    'Distinguish company-specific news from sector-wide or market-wide pressure.',
    'If a stock fell mainly because of broad market weakness, say that explicitly.',
    ...searchInstructions,
    'Do not provide buy/sell recommendations.',
    '',
    `Date: ${context.summaryDate}`,
    '',
    'Selected holdings (price data is authoritative):',
    buildHoldingsBlock(context),
    '',
    'Macro snapshot:',
    buildMacroBlock(context),
    '',
    'Reference headlines from our feed (may be incomplete):',
    headlinesBlock,
    '',
    'Return JSON with:',
    '- holdingInsights: one entry per requested ticker with sentiment (bullish, neutral, bearish), summary (2-3 sentences explaining TODAY), highlights (1-2 bullets)',
    '- marketDrivers: 2-4 macro/market themes explaining broader market context today',
  ].join('\n');
}

function getBriefingResponseSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      holdingInsights: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ticker: { type: 'string' },
            companyName: { type: 'string' },
            price: { type: 'number' },
            changePercent: { type: 'number' },
            currency: { type: 'string' },
            sentiment: {
              type: 'string',
              enum: ['bullish', 'neutral', 'bearish'],
            },
            summary: { type: 'string' },
            highlights: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['ticker', 'sentiment', 'summary', 'highlights'],
        },
      },
      marketDrivers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['title', 'explanation'],
        },
      },
    },
    required: ['holdingInsights', 'marketDrivers'],
  };
}

function parseBriefingJsonResponse(rawText: string): NewsSummaryPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AppError(502, 'AI returned an invalid response. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AppError(502, 'AI returned an invalid response. Please try again.');
  }

  const record = parsed as Record<string, unknown>;
  const rawHoldings = Array.isArray(record.holdingInsights) ? record.holdingInsights : [];
  const rawDrivers = Array.isArray(record.marketDrivers) ? record.marketDrivers : [];

  const holdingInsights = rawHoldings
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const ticker = typeof item.ticker === 'string' ? item.ticker.trim().toUpperCase() : '';
      const sentiment = item.sentiment;
      const summary = typeof item.summary === 'string' ? item.summary.trim() : '';
      const highlights = Array.isArray(item.highlights)
        ? item.highlights
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];

      const normalizedSentiment: NewsSummarySentiment =
        sentiment === 'bullish' || sentiment === 'bearish' ? sentiment : 'neutral';

      const insight: NewsSummaryHoldingInsight = {
        ticker,
        companyName: typeof item.companyName === 'string' ? item.companyName.trim() : ticker,
        price: typeof item.price === 'number' ? item.price : null,
        changePercent: typeof item.changePercent === 'number' ? item.changePercent : null,
        currency: typeof item.currency === 'string' ? item.currency : 'USD',
        sentiment: normalizedSentiment,
        summary,
        highlights,
      };

      return insight;
    })
    .filter((item) => item.ticker.length > 0 && item.summary.length > 0);

  const marketDrivers = rawDrivers
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title.trim() : '',
      explanation: typeof item.explanation === 'string' ? item.explanation.trim() : '',
    }))
    .filter((item) => item.title.length > 0 && item.explanation.length > 0)
    .slice(0, 4);

  if (holdingInsights.length === 0) {
    throw new AppError(502, 'AI returned an empty summary. Please try again.');
  }

  return {
    holdingInsights,
    marketDrivers,
  };
}

function extractGroundingSources(data: GeminiGenerateContentResponse): NewsSummarySource[] {
  const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sourceMap = new Map<string, NewsSummarySource>();

  for (const chunk of chunks) {
    const url = chunk.web?.uri?.trim();
    if (!url) {
      continue;
    }

    let title = chunk.web?.title?.trim() || url;
    try {
      title = chunk.web?.title?.trim() || new URL(url).hostname;
    } catch {
      title = chunk.web?.title?.trim() || url;
    }

    sourceMap.set(url, { title, url });
  }

  return [...sourceMap.values()].slice(0, 8);
}

function logGroundingUsage(data: GeminiGenerateContentResponse): void {
  const metadata = data.candidates?.[0]?.groundingMetadata;
  if (!metadata) {
    return;
  }

  const queries = metadata.webSearchQueries ?? [];
  if (queries.length > 0) {
    console.info('[GeminiClient] Grounding search queries:', queries.join(' | '));
  }
}

function handleGeminiAxiosError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const geminiMessage =
      typeof error.response?.data === 'object' &&
      error.response.data !== null &&
      'error' in error.response.data &&
      typeof (error.response.data as { error?: { message?: string } }).error?.message === 'string'
        ? (error.response.data as { error: { message: string } }).error.message
        : undefined;

    if (geminiMessage) {
      console.error(`[GeminiClient] API error (${status ?? 'unknown'}):`, geminiMessage);
    }

    if (status === 429) {
      throw new AppError(
        503,
        geminiMessage?.includes('quota') || geminiMessage?.includes('billing')
          ? 'Gemini quota or billing limit reached. Check AI Studio limits or try again later.'
          : 'AI service is temporarily busy. Please try again later.'
      );
    }

    if (status === 400 || status === 403 || status === 404) {
      console.error('[GeminiClient] Request rejected:', error.response?.data);
      throw new AppError(503, 'AI service is unavailable. Please try again later.');
    }
  }

  console.error('[GeminiClient] Briefing generation failed:', error);
  throw new AppError(502, 'Failed to generate AI summary. Please try again.');
}

export interface BriefingGenerationResult {
  payload: NewsSummaryPayload;
  sources: NewsSummarySource[];
  groundingEnabled: boolean;
}

function buildAlignmentPrompt(context: AlignmentPromptContext): string {
  const deviationsBlock =
    context.deviations.length > 0
      ? context.deviations
          .map(
            (item) =>
              `- ${item.label}: current ${item.currentPercent.toFixed(1)}%, target ${item.targetPercent.toFixed(1)}%, drift ${item.deviationPercent.toFixed(1)} pp (${item.status})`
          )
          .join('\n')
      : 'No allocation buckets available.';

  const holdingsBlock =
    context.topHoldings.length > 0
      ? context.topHoldings
          .map(
            (holding) =>
              `- ${holding.ticker} in ${holding.bucketLabel}: ~${context.displayCurrency} ${holding.marketValue.toFixed(0)}`
          )
          .join('\n')
      : 'No holdings mapped.';

  return [
    'You are a portfolio strategist explaining strategy alignment to a retail investor.',
    'Write in clear English. Use ONLY the numbers provided below.',
    'Do NOT invent holdings, prices, or market events.',
    'Do NOT give buy/sell recommendations or specific trade sizes.',
    'Explain what the alignment score and drifts mean in plain language.',
    'If alignment is high, say the portfolio is broadly on track. If low, explain concentration/drift risks.',
    '',
    `Date: ${context.explanationDate}`,
    `Strategy: ${context.strategyName}`,
    `Philosophy: ${context.strategyPhilosophy}`,
    `Investment horizon: ${context.investmentHorizon}`,
    `Alignment score: ${context.alignmentScore}/100`,
    `Portfolio value: ${context.displayCurrency} ${context.totalPortfolioValue.toFixed(0)}`,
    '',
    'Bucket drifts (current vs target):',
    deviationsBlock,
    '',
    'Largest holdings by market value (context only):',
    holdingsBlock,
    '',
    'Return JSON with:',
    '- overview: 2-3 sentences summarizing alignment today',
    '- keyDrifts: 2-4 items with title + explanation of the most important drifts or strengths',
    '- whatItMeans: 2-3 sentences on practical implications WITHOUT naming specific trades or amounts',
  ].join('\n');
}

function getAlignmentResponseSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      overview: { type: 'string' },
      keyDrifts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['title', 'explanation'],
        },
      },
      whatItMeans: { type: 'string' },
    },
    required: ['overview', 'keyDrifts', 'whatItMeans'],
  };
}

function parseAlignmentJsonResponse(rawText: string): AlignmentExplanationPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AppError(502, 'AI returned an invalid response. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new AppError(502, 'AI returned an invalid response. Please try again.');
  }

  const record = parsed as Record<string, unknown>;
  const overview = typeof record.overview === 'string' ? record.overview.trim() : '';
  const whatItMeans = typeof record.whatItMeans === 'string' ? record.whatItMeans.trim() : '';
  const rawDrifts = Array.isArray(record.keyDrifts) ? record.keyDrifts : [];

  const keyDrifts = rawDrifts
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title.trim() : '',
      explanation: typeof item.explanation === 'string' ? item.explanation.trim() : '',
    }))
    .filter((item) => item.title.length > 0 && item.explanation.length > 0)
    .slice(0, 4);

  if (!overview || !whatItMeans || keyDrifts.length === 0) {
    throw new AppError(502, 'AI returned an empty explanation. Please try again.');
  }

  return {
    overview,
    keyDrifts,
    whatItMeans,
  };
}

export async function generateAlignmentExplanationWithGemini(
  context: AlignmentPromptContext
): Promise<AlignmentExplanationPayload> {
  if (!isGeminiConfigured) {
    throw new AppError(503, 'AI summarization is not configured on the server.');
  }

  const prompt = buildAlignmentPrompt(context);

  try {
    const { data } = await geminiClient.post<GeminiGenerateContentResponse>(
      `/models/${GEMINI_MODEL}:generateContent`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: GEMINI_TEMPERATURE,
          maxOutputTokens: AI_EXPLAIN_ALIGNMENT_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
          responseSchema: getAlignmentResponseSchema(),
        },
      },
      {
        params: {
          key: env.geminiApiKey,
        },
        timeout: GEMINI_REQUEST_TIMEOUT_MS,
      }
    );

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new AppError(502, 'AI returned an empty response. Please try again.');
    }

    return parseAlignmentJsonResponse(rawText);
  } catch (error) {
    handleGeminiAxiosError(error);
  }
}

export async function generateBriefingWithGemini(
  context: BriefingPromptContext
): Promise<BriefingGenerationResult> {
  if (!isGeminiConfigured) {
    throw new AppError(503, 'AI summarization is not configured on the server.');
  }

  const useGrounding = context.groundingEnabled && isGeminiGroundingEnabled;
  const prompt = buildBriefingPrompt({ ...context, groundingEnabled: useGrounding });

  const requestBody: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: GEMINI_TEMPERATURE,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: getBriefingResponseSchema(),
    },
  };

  if (useGrounding) {
    requestBody.tools = [{ google_search: {} }];
  }

  try {
    const { data } = await geminiClient.post<GeminiGenerateContentResponse>(
      `/models/${GEMINI_MODEL}:generateContent`,
      requestBody,
      {
        params: {
          key: env.geminiApiKey,
        },
        timeout: useGrounding ? GEMINI_GROUNDING_REQUEST_TIMEOUT_MS : GEMINI_REQUEST_TIMEOUT_MS,
      }
    );

    if (useGrounding) {
      logGroundingUsage(data);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new AppError(502, 'AI returned an empty response. Please try again.');
    }

    return {
      payload: parseBriefingJsonResponse(rawText),
      sources: useGrounding ? extractGroundingSources(data) : [],
      groundingEnabled: useGrounding,
    };
  } catch (error) {
    handleGeminiAxiosError(error);
  }
}
