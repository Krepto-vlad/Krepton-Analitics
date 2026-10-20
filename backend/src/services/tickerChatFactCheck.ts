import {
  AI_CHAT_FACT_CHECK_MARKER_EN,
  AI_CHAT_FACT_CHECK_MARKER_RU,
  AI_CHAT_FACT_CHECK_PRICE_RELATIVE_TOLERANCE,
  AI_CHAT_FACT_CHECK_SHARES_ABS_TOLERANCE,
} from '../constants.js';
import type { TickerChatFactCheck, TickerChatHoldingContext } from '../types/ai.types.js';
import { logger } from '../utils/logger.js';

export interface TickerChatFactCheckInput {
  ticker: string;
  reply: string;
  userMessage: string;
  price: number;
  currency: string;
  changePercent: number;
  holding: TickerChatHoldingContext | null;
  /** Other Krepton prices attached for this turn, such as a comparison on screen. */
  referencePrices?: number[];
}

export interface TickerChatFactCheckResult {
  reply: string;
  factCheck: TickerChatFactCheck;
}

const CURRENT_PRICE_CLAIM_PATTERN =
  /(?:trading at|trades at|priced? at|price(?:\s+is|\s+of|:)|quote(?:\s+is|:)|last(?:\s+price)?(?:\s+is|:)|currently(?:\s+at)?|торгуется(?:\s+по)?|цена(?:\s+—|:| составляет)?|котировка(?:\s+—|:)?)\s*\$?\s*(\d{1,6}(?:[.,]\d{1,4})?)/gi;

const SHARES_CLAIM_PATTERN = /(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:shares|акци)/gi;

const INVENTED_POSITION_PATTERN =
  /(?:you (?:hold|have|own)|your position|у вас)\s+(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:shares|акци)/gi;

function prefersRussian(text: string): boolean {
  return /[а-яё]/i.test(text);
}

function parseNumericToken(rawValue: string): number | null {
  const normalized = rawValue.replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function relativeError(actual: number, expected: number): number {
  if (expected === 0) {
    return Math.abs(actual);
  }

  return Math.abs(actual - expected) / Math.abs(expected);
}

function isNearPrice(actual: number, expected: number): boolean {
  return relativeError(actual, expected) <= AI_CHAT_FACT_CHECK_PRICE_RELATIVE_TOLERANCE;
}

function isAllowedPrice(actual: number, focusPrice: number, referencePrices: number[]): boolean {
  if (isNearPrice(actual, focusPrice)) {
    return true;
  }

  return referencePrices.some((price) => isNearPrice(actual, price));
}

function isNearShares(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= AI_CHAT_FACT_CHECK_SHARES_ABS_TOLERANCE;
}

function collectCapturedNumbers(text: string, pattern: RegExp): number[] {
  const values: number[] = [];
  const matcher = new RegExp(pattern.source, pattern.flags);
  let match = matcher.exec(text);

  while (match) {
    const parsed = parseNumericToken(match[1] ?? '');
    if (parsed !== null) {
      values.push(parsed);
    }
    match = matcher.exec(text);
  }

  return values;
}

function collectTickerAtPrices(ticker: string, text: string): number[] {
  const escapedTicker = ticker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `${escapedTicker}\\s+(?:is\\s+)?(?:at\\s+)?\\$?(\\d{1,6}(?:[.,]\\d{1,4})?)(?!\\s*%)`,
    'gi'
  );
  return collectCapturedNumbers(text, pattern);
}

function formatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function buildCorrectionAppendix(input: TickerChatFactCheckInput): string {
  const quoteLine = `${formatMoney(input.currency, input.price)} (${formatSignedPercent(input.changePercent)})`;
  const holdingLine = input.holding
    ? `${input.holding.shares} shares @ ${formatMoney(input.holding.currency, input.holding.avgBuyPrice)}`
    : `no open ${input.ticker} position in Krepton`;

  if (prefersRussian(`${input.userMessage}\n${input.reply}`)) {
    const russianHolding = input.holding
      ? `${input.holding.shares} акций @ ${formatMoney(input.holding.currency, input.holding.avgBuyPrice)}`
      : `открытой позиции по ${input.ticker} в Krepton нет`;
    return [
      AI_CHAT_FACT_CHECK_MARKER_RU,
      `живая котировка ${quoteLine}.`,
      `Позиция: ${russianHolding}.`,
      'Новости из поиска отдельно не проверяются.',
    ].join(' ');
  }

  return [
    AI_CHAT_FACT_CHECK_MARKER_EN,
    `live quote is ${quoteLine}.`,
    `Position: ${holdingLine}.`,
    'Web search news is not independently verified.',
  ].join(' ');
}

function alreadyHasFactCheckAppendix(reply: string): boolean {
  return (
    reply.includes(AI_CHAT_FACT_CHECK_MARKER_EN) || reply.includes(AI_CHAT_FACT_CHECK_MARKER_RU)
  );
}

export function buildEmptyTickerChatFactCheck(): TickerChatFactCheck {
  return {
    quoteVerified: true,
    holdingVerified: true,
    corrected: false,
    livePrice: null,
    currency: null,
    changePercent: null,
    shares: null,
    avgBuyPrice: null,
  };
}

export function buildSnapshotTickerChatFactCheck(input: {
  price: number;
  currency: string;
  changePercent: number;
  holding: TickerChatHoldingContext | null;
}): TickerChatFactCheck {
  return {
    quoteVerified: true,
    holdingVerified: true,
    corrected: false,
    livePrice: input.price,
    currency: input.currency,
    changePercent: input.changePercent,
    shares: input.holding?.shares ?? null,
    avgBuyPrice: input.holding?.avgBuyPrice ?? null,
  };
}

/**
 * Compare model numbers against the Krepton quote/holding snapshot.
 * News/catalyst claims from Google Search are cited, not numerically verified.
 */
export function applyTickerChatFactCheck(
  input: TickerChatFactCheckInput
): TickerChatFactCheckResult {
  const statedPrices = [
    ...collectCapturedNumbers(input.reply, CURRENT_PRICE_CLAIM_PATTERN),
    ...collectTickerAtPrices(input.ticker, input.reply),
  ];
  const referencePrices = input.referencePrices ?? [];
  const quoteVerified = statedPrices.every((value) =>
    isAllowedPrice(value, input.price, referencePrices)
  );

  const holding = input.holding;
  const statedShares = collectCapturedNumbers(input.reply, SHARES_CLAIM_PATTERN);
  const inventedPosition =
    holding === null &&
    collectCapturedNumbers(input.reply, INVENTED_POSITION_PATTERN).some((value) => value > 0);
  const sharesMatchHolding =
    holding === null
      ? statedShares.length === 0 || statedShares.every((value) => value === 0)
      : statedShares.every((value) => isNearShares(value, holding.shares));

  const holdingVerified = !inventedPosition && sharesMatchHolding;
  const corrected = !quoteVerified || !holdingVerified;

  const factCheck: TickerChatFactCheck = {
    quoteVerified,
    holdingVerified,
    corrected,
    livePrice: input.price,
    currency: input.currency,
    changePercent: input.changePercent,
    shares: input.holding?.shares ?? null,
    avgBuyPrice: input.holding?.avgBuyPrice ?? null,
  };

  if (!corrected || alreadyHasFactCheckAppendix(input.reply)) {
    return { reply: input.reply, factCheck };
  }

  logger.warn(
    {
      ticker: input.ticker,
      quoteVerified,
      holdingVerified,
      statedPrices,
      statedShares,
    },
    'Ticker chat fact-check corrected a reply'
  );

  return {
    reply: `${input.reply.trim()}\n\n${buildCorrectionAppendix(input)}`,
    factCheck,
  };
}
