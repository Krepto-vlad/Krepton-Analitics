const mockPost = jest.fn();
const geminiConfig = { configured: true, grounding: false };

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      post: (...args: unknown[]) => mockPost(...args),
    })),
    isAxiosError: (error: unknown) =>
      Boolean(
        error && typeof error === 'object' && (error as { isAxiosError?: boolean }).isAxiosError
      ),
  },
}));

jest.mock('../../../config/env.js', () => ({
  env: { geminiApiKey: 'test-gemini-key' },
  get isGeminiConfigured() {
    return geminiConfig.configured;
  },
  get isGeminiGroundingEnabled() {
    return geminiConfig.grounding;
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  generateAlignmentExplanationWithGemini,
  generateBriefingWithGemini,
  generateTickerChatReplyWithGemini,
  inferImportSchemaWithGemini,
} from '../../../services/geminiClient.js';
import type {
  AlignmentPromptContext,
  BriefingPromptContext,
  TickerChatPromptContext,
} from '../../../types/ai.types.js';

function axiosError(status: number, data?: unknown): Error {
  const error = new Error('Gemini HTTP error') as Error & {
    isAxiosError: boolean;
    response?: { status: number; data: unknown };
  };
  error.isAxiosError = true;
  error.response = { status, data };
  return error;
}

function geminiTextResponse(text: string, extras: Record<string, unknown> = {}) {
  return {
    data: {
      candidates: [
        {
          content: { parts: [{ text }] },
          ...extras,
        },
      ],
    },
  };
}

function briefingContext(overrides: Partial<BriefingPromptContext> = {}): BriefingPromptContext {
  return {
    summaryDate: '2026-09-08',
    holdings: [
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        price: 190,
        changePercent: 1.5,
        currency: 'USD',
        shares: 10,
        avgBuyPrice: 150,
        unrealizedPnlPercent: 26.6,
      },
    ],
    macroSnapshots: [{ ticker: '^GSPC', label: 'S&P 500', price: 5000, changePercent: -0.4 }],
    headlineLines: ['- AAPL: iPhone demand holds'],
    includePortfolioContext: true,
    groundingEnabled: false,
    ...overrides,
  };
}

function alignmentContext(overrides: Partial<AlignmentPromptContext> = {}): AlignmentPromptContext {
  return {
    explanationDate: '2026-09-08',
    strategyName: 'Warren Buffett 90/10',
    strategyPhilosophy: 'Equities first',
    investmentHorizon: '10+ years',
    alignmentScore: 72,
    totalPortfolioValue: 10000,
    displayCurrency: 'USD',
    deviations: [
      {
        label: 'Equities',
        currentPercent: 80,
        targetPercent: 90,
        deviationPercent: -10,
        status: 'underweight',
      },
    ],
    topHoldings: [
      {
        ticker: 'VOO',
        bucketLabel: 'Equities',
        marketValue: 9000,
        weightPercent: 90,
        sector: 'N/A',
      },
    ],
    falseDiversificationHints: {
      overlappingClusters: [
        {
          label: 'US large-cap',
          tickersPresent: ['VOO', 'QQQ'],
          note: 'Similar factor exposure',
        },
      ],
      topSectors: [{ sector: 'Technology', weightPercent: 40 }],
    },
    ...overrides,
  };
}

function chatContext(overrides: Partial<TickerChatPromptContext> = {}): TickerChatPromptContext {
  return {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    currency: 'USD',
    price: 190,
    changePercent: -1.2,
    marketState: 'REGULAR',
    exchange: 'NMS',
    holding: {
      shares: 5,
      avgBuyPrice: 150,
      currency: 'USD',
      unrealizedPnlPercent: 26.6,
    },
    history: [{ role: 'user', content: 'What moved the price?' }],
    userMessage: 'Summarize today',
    ...overrides,
  };
}

function validBriefingJson(): string {
  return JSON.stringify({
    holdingInsights: [
      {
        ticker: 'aapl',
        companyName: 'Apple Inc.',
        price: 190,
        changePercent: 1.5,
        currency: 'USD',
        sentiment: 'bullish',
        summary: 'iPhone demand remains firm.',
        highlights: ['Services growth', 12, '   '],
      },
    ],
    marketDrivers: [
      { title: 'Rates', explanation: 'Yields eased risk appetite.' },
      { title: '', explanation: 'drop' },
    ],
  });
}

function validAlignmentJson(): string {
  return JSON.stringify({
    overview: 'The portfolio is slightly off the equity target.',
    keyDrifts: [{ title: 'Equities underweight', explanation: 'Cash drag vs 90% target.' }],
    falseDiversification: {
      riskLevel: 'moderate',
      title: 'Overlapping equity ETFs',
      explanation: 'VOO and QQQ share large-cap US factor risk.',
    },
    whatItMeans: 'Revisit the equity sleeve before adding similar funds.',
  });
}

describe('geminiClient', () => {
  beforeEach(() => {
    mockPost.mockReset();
    geminiConfig.configured = true;
    geminiConfig.grounding = false;
  });

  describe('generateBriefingWithGemini', () => {
    it('rejects when Gemini is not configured', async () => {
      geminiConfig.configured = false;

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('parses a briefing and keeps invalid highlight entries out', async () => {
      mockPost.mockResolvedValue(geminiTextResponse(validBriefingJson()));

      const result = await generateBriefingWithGemini(
        briefingContext({ includePortfolioContext: false, holdings: [] })
      );

      expect(result.groundingEnabled).toBe(false);
      expect(result.sources).toEqual([]);
      expect(result.payload.holdingInsights[0]).toMatchObject({
        ticker: 'AAPL',
        sentiment: 'bullish',
        highlights: ['Services growth'],
      });
      expect(result.payload.marketDrivers).toEqual([
        { title: 'Rates', explanation: 'Yields eased risk appetite.' },
      ]);
    });

    it('extracts grounding sources and logs search queries', async () => {
      geminiConfig.grounding = true;
      mockPost.mockResolvedValue(
        geminiTextResponse(validBriefingJson(), {
          groundingMetadata: {
            webSearchQueries: ['AAPL news'],
            groundingChunks: [
              { web: { uri: 'https://example.com/a', title: 'Example' } },
              { web: { uri: 'https://example.com/a', title: 'Duplicate' } },
              { web: { uri: 'not a url' } },
              { web: {} },
            ],
          },
        })
      );

      const result = await generateBriefingWithGemini(
        briefingContext({ groundingEnabled: true, headlineLines: [] })
      );

      expect(result.groundingEnabled).toBe(true);
      expect(result.sources).toEqual([
        { title: 'Duplicate', url: 'https://example.com/a' },
        { title: 'not a url', url: 'not a url' },
      ]);
    });

    it('maps Gemini 429 quota errors to 503', async () => {
      mockPost.mockRejectedValue(
        axiosError(429, { error: { message: 'quota exceeded for billing' } })
      );

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringMatching(/quota or billing/i),
      });
    });

    it('maps Gemini 429 without quota wording to a busy 503', async () => {
      mockPost.mockRejectedValue(axiosError(429, { error: { message: 'rate limited' } }));

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringMatching(/temporarily busy/i),
      });
    });

    it('maps rejected Gemini requests to 503', async () => {
      mockPost.mockRejectedValue(axiosError(403, { error: { message: 'blocked' } }));

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 503,
      });
    });

    it('maps invalid JSON to 502', async () => {
      mockPost.mockResolvedValue(geminiTextResponse('not-json'));

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it('maps an empty holdings payload to 502', async () => {
      mockPost.mockResolvedValue(
        geminiTextResponse(JSON.stringify({ holdingInsights: [], marketDrivers: [] }))
      );

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it('maps a missing candidate text to 502', async () => {
      mockPost.mockResolvedValue({ data: { candidates: [{ content: { parts: [{}] } }] } });

      await expect(generateBriefingWithGemini(briefingContext())).rejects.toMatchObject({
        statusCode: 502,
      });
    });
  });

  describe('generateAlignmentExplanationWithGemini', () => {
    it('parses alignment JSON including false-diversification risk', async () => {
      mockPost.mockResolvedValue(geminiTextResponse(validAlignmentJson()));

      const payload = await generateAlignmentExplanationWithGemini(
        alignmentContext({
          deviations: [],
          topHoldings: [],
          falseDiversificationHints: { overlappingClusters: [], topSectors: [] },
        })
      );

      expect(payload.falseDiversification?.riskLevel).toBe('moderate');
      expect(payload.keyDrifts).toHaveLength(1);
    });

    it('rejects an incomplete alignment payload', async () => {
      mockPost.mockResolvedValue(
        geminiTextResponse(
          JSON.stringify({
            overview: 'ok',
            keyDrifts: [],
            falseDiversification: { riskLevel: 'low', title: 't', explanation: 'e' },
            whatItMeans: 'ok',
          })
        )
      );

      await expect(
        generateAlignmentExplanationWithGemini(alignmentContext())
      ).rejects.toMatchObject({ statusCode: 502 });
    });
  });

  describe('inferImportSchemaWithGemini', () => {
    it('maps a valid schema including a dedicated currency column', async () => {
      mockPost.mockResolvedValue(
        geminiTextResponse(
          JSON.stringify({
            headerRowIndex: 0,
            confidence: 1.4,
            columns: {
              date: 0,
              ticker: 1,
              side: 2,
              quantity: 3,
              price: 4,
              currency: 5,
            },
          })
        )
      );

      const result = await inferImportSchemaWithGemini({
        sampleRows: [
          ['Date', 'Ticker', 'Side', 'Qty', 'Price', 'CCY'],
          ['2024-01-01', 'AAPL', 'BUY', '10', '100', 'USD'],
        ],
        columnCount: 6,
      });

      expect(result.confidence).toBe(1);
      expect(result.mapping.columns).toEqual({
        date: 0,
        ticker: 1,
        side: 2,
        quantity: 3,
        price: 4,
        currency: 5,
      });
    });

    it('treats currency-on-price as no dedicated currency column', async () => {
      mockPost.mockResolvedValue(
        geminiTextResponse(
          JSON.stringify({
            headerRowIndex: 0,
            confidence: 0.8,
            columns: {
              date: 0,
              ticker: 1,
              side: 2,
              quantity: 3,
              price: 4,
              currency: 4,
            },
          })
        )
      );

      const result = await inferImportSchemaWithGemini({
        sampleRows: [['Date', 'Ticker', 'Side', 'Qty', 'Price']],
        columnCount: 5,
      });

      expect(result.mapping.columns.currency).toBeNull();
    });

    it('rejects empty samples and duplicate required columns', async () => {
      await expect(
        inferImportSchemaWithGemini({ sampleRows: [], columnCount: 4 })
      ).rejects.toMatchObject({ statusCode: 400 });

      mockPost.mockResolvedValue(
        geminiTextResponse(
          JSON.stringify({
            headerRowIndex: 0,
            confidence: 0.5,
            columns: {
              date: 0,
              ticker: 0,
              side: 2,
              quantity: 3,
              price: 4,
              currency: -1,
            },
          })
        )
      );

      await expect(
        inferImportSchemaWithGemini({
          sampleRows: [['Date', 'Ticker', 'Side', 'Qty', 'Price']],
          columnCount: 5,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('generateTickerChatReplyWithGemini', () => {
    it('returns a sanitized reply for a holding context', async () => {
      mockPost.mockResolvedValue(
        geminiTextResponse('Apple sold off with the market. Not financial advice.')
      );

      await expect(generateTickerChatReplyWithGemini(chatContext())).resolves.toEqual(
        expect.stringMatching(/Apple/i)
      );
    });

    it('still builds a prompt when the user has no holding', async () => {
      mockPost.mockResolvedValue(geminiTextResponse('No position on file for this ticker.'));

      await expect(
        generateTickerChatReplyWithGemini(chatContext({ holding: null, history: [] }))
      ).resolves.toEqual(expect.stringMatching(/position/i));
    });
  });
});
