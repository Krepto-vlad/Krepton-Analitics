import {
  AI_EMPTY_REPLY_ERROR_MESSAGE,
  AI_TICKER_CHAT_DISCLAIMER,
  AI_TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS,
  AI_TICKER_CHAT_MAX_HISTORY_MESSAGES,
  AI_TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS,
  AI_TICKER_CHAT_MAX_MESSAGE_CHARS,
  AI_TICKER_CHAT_PAGE_SUBJECT,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
} from '../repositories/portfolioRepository.js';
import type {
  AiQuotaStatus,
  GenerateTickerChatDto,
  TickerChatHistoryMessage,
  TickerChatHoldingContext,
  TickerChatPromptContext,
  TickerChatResponse,
  TickerChatRole,
} from '../types/ai.types.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { assertValidTickerSymbol, TICKER_FORMAT_ERROR_MESSAGE } from '../utils/tickerValidation.js';
import { assertAiQuotaAvailable, getAiQuotaStatus, recordAiUsage } from './aiQuotaService.js';
import { generateTickerChatReplyWithGemini } from './geminiClient.js';
import { getCachedStockQuote } from './quoteCacheService.js';
import {
  applyTickerChatFactCheck,
  buildEmptyTickerChatFactCheck,
  buildSnapshotTickerChatFactCheck,
} from './tickerChatFactCheck.js';
import { resolveTickerChatScreenContext } from './tickerChatScreenContext.js';
import {
  applyTickerChatOutputGuardrails,
  evaluateTickerChatInputScope,
  stripTickerChatOutboundLinks,
} from './tickerChatScope.js';

const TICKER_CHAT_FEATURE = 'ticker_chat' as const;
const HISTORY_TRUNCATION_SUFFIX = '…';

function truncateChatText(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const sliceLength = Math.max(0, maxChars - HISTORY_TRUNCATION_SUFFIX.length);
  return `${content.slice(0, sliceLength).trimEnd()}${HISTORY_TRUNCATION_SUFFIX}`;
}

function normalizeMessageContent(rawValue: unknown, fieldName: string): string {
  if (typeof rawValue !== 'string') {
    throw new AppError(400, `${fieldName} must be a string`);
  }

  const content = rawValue.trim();
  if (content.length === 0) {
    throw new AppError(400, `${fieldName} cannot be empty`);
  }

  if (content.length > AI_TICKER_CHAT_MAX_MESSAGE_CHARS) {
    throw new AppError(
      400,
      `${fieldName} must be at most ${AI_TICKER_CHAT_MAX_MESSAGE_CHARS} characters`
    );
  }

  return content;
}

function normalizeHistoryContent(rawValue: unknown): string {
  if (typeof rawValue !== 'string') {
    throw new AppError(400, 'history content must be a string');
  }

  const content = rawValue.trim();
  if (content.length === 0) {
    throw new AppError(400, 'history content cannot be empty');
  }

  return truncateChatText(content, AI_TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS);
}

/**
 * Keeps the newest history messages within the total char budget.
 * Older turns are dropped first so follow-ups stay coherent.
 */
function trimHistoryToTotalBudget(history: TickerChatHistoryMessage[]): TickerChatHistoryMessage[] {
  const keptNewestFirst: TickerChatHistoryMessage[] = [];
  let usedChars = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    const nextTotal = usedChars + message.content.length;
    if (keptNewestFirst.length > 0 && nextTotal > AI_TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS) {
      break;
    }

    keptNewestFirst.push(message);
    usedChars = nextTotal;
  }

  return keptNewestFirst.reverse();
}

function normalizeHistory(rawHistory: unknown): TickerChatHistoryMessage[] {
  if (rawHistory === undefined) {
    return [];
  }

  if (!Array.isArray(rawHistory)) {
    throw new AppError(400, 'history must be an array');
  }

  const normalizedHistory: TickerChatHistoryMessage[] = [];

  for (const item of rawHistory.slice(-AI_TICKER_CHAT_MAX_HISTORY_MESSAGES)) {
    if (!item || typeof item !== 'object') {
      throw new AppError(400, 'history items must be objects');
    }

    const roleValue = (item as { role?: unknown }).role;
    if (roleValue !== 'user' && roleValue !== 'assistant') {
      throw new AppError(400, 'history role must be user or assistant');
    }

    normalizedHistory.push({
      role: roleValue as TickerChatRole,
      content: normalizeHistoryContent((item as { content?: unknown }).content),
    });
  }

  return trimHistoryToTotalBudget(normalizedHistory);
}

function readOptionalTicker(rawTicker: unknown): string | null {
  if (rawTicker === undefined || rawTicker === null || rawTicker === '') {
    return null;
  }

  if (typeof rawTicker !== 'string') {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }

  try {
    return assertValidTickerSymbol(rawTicker);
  } catch {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }
}

function normalizeTickerChatDto(rawBody: unknown): {
  ticker: string | null;
  message: string;
  history: TickerChatHistoryMessage[];
  includeHoldingContext: boolean;
} {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new AppError(400, 'Request body is required');
  }

  const body = rawBody as GenerateTickerChatDto;

  return {
    ticker: readOptionalTicker(body.ticker),
    message: normalizeMessageContent(body.message, 'message'),
    history: normalizeHistory(body.history),
    includeHoldingContext: body.includeHoldingContext === true,
  };
}

async function resolveHoldingContext(
  userId: string,
  ticker: string,
  currentPrice: number
): Promise<TickerChatHoldingContext | null> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const positions = await getPositionsByPortfolioId(portfolioId);
  const matchingPositions = positions.filter(
    (position) => position.ticker.trim().toUpperCase() === ticker
  );

  if (matchingPositions.length === 0) {
    return null;
  }

  const shares = matchingPositions.reduce((sum, position) => sum + parseFloat(position.shares), 0);
  if (shares <= 0) {
    return null;
  }

  const totalCost = matchingPositions.reduce(
    (sum, position) => sum + parseFloat(position.shares) * parseFloat(position.avg_buy_price),
    0
  );
  const avgBuyPrice = totalCost / shares;
  const unrealizedPnlPercent =
    avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;

  return {
    shares,
    avgBuyPrice,
    currency: matchingPositions[0]?.currency ?? 'USD',
    unrealizedPnlPercent,
  };
}

export async function getTickerChatQuota(userId: string): Promise<AiQuotaStatus> {
  return getAiQuotaStatus(userId, TICKER_CHAT_FEATURE);
}

export async function sendTickerChatMessage(
  userId: string,
  rawBody: unknown
): Promise<TickerChatResponse> {
  const { ticker, message, history, includeHoldingContext } = normalizeTickerChatDto(rawBody);
  if (!ticker) {
    return sendPageChatMessage(userId, message, history, rawBody);
  }

  const scopeDecision = evaluateTickerChatInputScope(ticker, message);

  if (scopeDecision.kind === 'soft_redirect') {
    const quota = await getAiQuotaStatus(userId, TICKER_CHAT_FEATURE);
    return {
      ticker,
      reply: scopeDecision.reply,
      disclaimer: AI_TICKER_CHAT_DISCLAIMER,
      quota,
      sources: [],
      groundingEnabled: false,
      factCheck: buildEmptyTickerChatFactCheck(),
      displayBlocks: [],
    };
  }

  const quote = await getCachedStockQuote(ticker);
  if (quote.price <= 0) {
    throw new AppError(404, `No data found for ticker: ${ticker}`);
  }

  await assertAiQuotaAvailable(userId, TICKER_CHAT_FEATURE);

  const holding = includeHoldingContext
    ? await resolveHoldingContext(userId, ticker, quote.price)
    : null;
  const screenContext = await resolveTickerChatScreenContext(
    userId,
    (rawBody as { screenContext?: unknown }).screenContext,
    ticker
  );

  const promptContext: TickerChatPromptContext = {
    ticker,
    companyName: quote.name || ticker,
    currency: quote.currency || 'USD',
    price: quote.price,
    changePercent: quote.changePercent,
    marketState: quote.marketState,
    exchange: quote.exchange,
    holding,
    includeHoldingContext,
    history,
    userMessage: scopeDecision.userMessage,
    screenContextText: screenContext?.promptText ?? null,
  };

  const generation = await generateTickerChatReplyWithGemini(promptContext);
  const guardrail = applyTickerChatOutputGuardrails(
    ticker,
    scopeDecision.userMessage,
    generation.reply
  );

  const blocked = guardrail.blockedReason !== 'none';
  const factChecked = blocked
    ? {
        reply: guardrail.reply,
        factCheck: buildSnapshotTickerChatFactCheck({
          price: quote.price,
          currency: quote.currency || 'USD',
          changePercent: quote.changePercent,
          holding,
        }),
      }
    : applyTickerChatFactCheck({
        ticker,
        reply: guardrail.reply,
        userMessage: scopeDecision.userMessage,
        price: quote.price,
        currency: quote.currency || 'USD',
        changePercent: quote.changePercent,
        holding,
        referencePrices: screenContext?.referencePrices ?? [],
      });

  const deliveredReply = stripTickerChatOutboundLinks(factChecked.reply);
  if (deliveredReply.length === 0) {
    throw new AppError(502, AI_EMPTY_REPLY_ERROR_MESSAGE);
  }

  await recordAiUsage(userId, TICKER_CHAT_FEATURE);
  const quota = await getAiQuotaStatus(userId, TICKER_CHAT_FEATURE);

  return {
    ticker,
    reply: deliveredReply,
    disclaimer: AI_TICKER_CHAT_DISCLAIMER,
    quota,
    sources: [],
    groundingEnabled: blocked ? false : generation.groundingEnabled,
    factCheck: factChecked.factCheck,
    displayBlocks: screenContext?.displayBlocks ?? [],
  };
}

async function sendPageChatMessage(
  userId: string,
  message: string,
  history: TickerChatHistoryMessage[],
  rawBody: unknown
): Promise<TickerChatResponse> {
  const scopeDecision = evaluateTickerChatInputScope(AI_TICKER_CHAT_PAGE_SUBJECT, message);

  if (scopeDecision.kind === 'soft_redirect') {
    const quota = await getAiQuotaStatus(userId, TICKER_CHAT_FEATURE);
    return {
      ticker: '',
      reply: scopeDecision.reply,
      disclaimer: AI_TICKER_CHAT_DISCLAIMER,
      quota,
      sources: [],
      groundingEnabled: false,
      factCheck: buildEmptyTickerChatFactCheck(),
      displayBlocks: [],
    };
  }

  await assertAiQuotaAvailable(userId, TICKER_CHAT_FEATURE);

  const screenContext = await resolveTickerChatScreenContext(
    userId,
    (rawBody as { screenContext?: unknown }).screenContext,
    ''
  );

  const promptContext: TickerChatPromptContext = {
    ticker: '',
    companyName: AI_TICKER_CHAT_PAGE_SUBJECT,
    currency: 'USD',
    price: 0,
    changePercent: 0,
    marketState: null,
    exchange: null,
    holding: null,
    includeHoldingContext: false,
    history,
    userMessage: scopeDecision.userMessage,
    screenContextText: screenContext?.promptText ?? null,
  };

  const generation = await generateTickerChatReplyWithGemini(promptContext);
  const guardrail = applyTickerChatOutputGuardrails(
    AI_TICKER_CHAT_PAGE_SUBJECT,
    scopeDecision.userMessage,
    generation.reply
  );
  const deliveredReply = stripTickerChatOutboundLinks(guardrail.reply);
  if (deliveredReply.length === 0) {
    throw new AppError(502, AI_EMPTY_REPLY_ERROR_MESSAGE);
  }

  await recordAiUsage(userId, TICKER_CHAT_FEATURE);
  const quota = await getAiQuotaStatus(userId, TICKER_CHAT_FEATURE);

  return {
    ticker: '',
    reply: deliveredReply,
    disclaimer: AI_TICKER_CHAT_DISCLAIMER,
    quota,
    sources: [],
    groundingEnabled: guardrail.blockedReason === 'none' && generation.groundingEnabled,
    factCheck: buildEmptyTickerChatFactCheck(),
    displayBlocks: screenContext?.displayBlocks ?? [],
  };
}
