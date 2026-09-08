import {
  AI_CHAT_TICKER_TYPO_MAX_DISTANCE,
  AI_CHAT_TICKER_TYPO_MIN_TICKER_LENGTH,
} from '../constants.js';

/**
 * Soft product-scope guardrails for ticker chat.
 * Input heuristics + post-generation output checks (fintech-style)
 * before the reply is returned to the client.
 */

const PROGRAMMING_LANGUAGE_PATTERN =
  /\b(python|py\b|javascript|typescript|\bjs\b|\bts\b|java\b|c\+\+|cpp|golang|\bgo\b|rust|kotlin|swift|php|ruby|matlab|r\b|sql)\b/i;

const CODE_REQUEST_PATTERN =
  /(напиши\s+код|дай\s+код|код\s+на|write\s+(me\s+)?(a\s+)?(code|script|program|function|snippet)|generate\s+(a\s+)?(code|script)|code\s+snippet|sample\s+code|import\s+yfinance|def\s+\w+\s*\(|async\s+def\s+|```)/i;

const GENERAL_ASSISTANT_ABUSE_PATTERN =
  /(напиши\s+(стих|стихотворение|сказк|эссе|сочинен)|write\s+(me\s+)?(a\s+)?(poem|essay|story|recipe)|переведи\s+весь|translate\s+this\s+(essay|article|book)|roleplay\s+as|ignore\s+(all\s+)?(previous|prior)\s+instructions|act\s+as\s+(a\s+)?general|ты\s+теперь\s+chatgpt|you\s+are\s+now\s+chatgpt)/i;

const PROGRAMMING_CODE_FENCE_PATTERN =
  /```(?:python|py|javascript|js|typescript|ts|java|c\+\+|cpp|go|rust|bash|shell|sh|sql|kotlin|swift|php|ruby|r)\b[\s\S]*?```/i;

/** Personalized trade instructions — not educational discussion of buying/selling. */
const PERSONALIZED_ADVICE_PATTERNS: RegExp[] = [
  /\b(you should|you must|you ought to|i recommend|i advise|my advice is|i would)\b[\s\S]{0,48}\b(buy|sell|hold|dump|enter|exit)\b/i,
  /\b(buy|sell|dump)\s+(it|now|more|today|monday|tomorrow|this|the\s+stock|shares)\b/i,
  /\b(definitely|certainly|strongly)\s+(buy|sell|hold)\b/i,
  /\b(go ahead and|time to)\s+(buy|sell)\b/i,
  /(рекомендую|советую|мой совет)\s[\s\S]{0,40}(купить|продать|докупить|сбросить|держать)/i,
  /\b(стоит|нужно|обязательно)\s+(купить|продать|докупить|сбросить)\b/i,
  /\b(покупай|продавай|купи|продай|докулай)\b/i,
  /\b(я бы)\s+(купил|купила|продал|продала)\b/i,
];

/** Absolute outcome claims that read like advice, not risk discussion. */
const GUARANTEED_OUTCOME_PATTERNS: RegExp[] = [
  /\bguaranteed\s+(return|profit|gain|upside|income)\b/i,
  /\b(will|won't)\s+(definitely|certainly|surely|guaranteed)\s+(rise|fall|rally|crash|go\s+up|go\s+down|profit)\b/i,
  /\bno[- ]risk\s+(return|profit|investment|trade)\b/i,
  /\b(risk[- ]free)\s+(return|profit|gain)\b/i,
  /гарантированн\w*[\s\S]{0,48}(доход|прибыл|рост|return|профит)/i,
  /\b(точно|обязательно)\s+(вырастет|упадёт|упадет|вырастит|принесёт|принесет)\b/i,
  /\bбез\s+риска\s+(доход|прибыл|инвести)/i,
];

export type TickerChatScopeDecision =
  | { kind: 'allow'; userMessage: string }
  | { kind: 'soft_redirect'; reply: string };

export type TickerChatOutputBlockReason =
  | 'none'
  | 'code'
  | 'personalized_advice'
  | 'guaranteed_outcome';

export interface TickerChatOutputGuardrailResult {
  reply: string;
  blockedReason: TickerChatOutputBlockReason;
}

function prefersRussian(text: string): boolean {
  return /[а-яё]/i.test(text);
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const rows = left.length + 1;
  const columns = right.length + 1;
  const distances: number[] = Array.from({ length: rows * columns }, () => 0);

  for (let row = 0; row < rows; row += 1) {
    distances[row * columns] = row;
  }
  for (let column = 0; column < columns; column += 1) {
    distances[column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      const deletion = distances[(row - 1) * columns + column] + 1;
      const insertion = distances[row * columns + column - 1] + 1;
      const substitution = distances[(row - 1) * columns + column - 1] + substitutionCost;
      distances[row * columns + column] = Math.min(deletion, insertion, substitution);
    }
  }

  return distances[left.length * columns + right.length];
}

function normalizeTickerToken(token: string): string {
  return token.trim().toUpperCase();
}

function shouldCorrectTickerToken(ticker: string, token: string): boolean {
  if (ticker.length < AI_CHAT_TICKER_TYPO_MIN_TICKER_LENGTH) {
    return false;
  }

  if (token === ticker) {
    return false;
  }

  if (token.length < ticker.length - AI_CHAT_TICKER_TYPO_MAX_DISTANCE) {
    return false;
  }

  const distance = levenshteinDistance(token, ticker);
  return distance > 0 && distance <= AI_CHAT_TICKER_TYPO_MAX_DISTANCE;
}

/**
 * Replace near-miss spellings of the focus ticker in the user message.
 * Does not run a general spellchecker.
 */
export function correctFocusTickerTypos(ticker: string, message: string): string {
  const normalizedTicker = normalizeTickerToken(ticker);
  if (normalizedTicker.length < AI_CHAT_TICKER_TYPO_MIN_TICKER_LENGTH) {
    return message;
  }

  return message.replace(/[A-Za-z0-9.=\-^]+/g, (token) => {
    const normalizedToken = normalizeTickerToken(token);
    return shouldCorrectTickerToken(normalizedTicker, normalizedToken) ? normalizedTicker : token;
  });
}

function buildCodingRedirect(ticker: string, userMessage: string): string {
  if (prefersRussian(userMessage)) {
    return [
      `Код и скрипты здесь не пишу — это чат по ${ticker}, не общий Gemini.`,
      `Могу разобрать return/P&L, цену, риски или новости по этой бумаге на данных Krepton. Сформулируй вопрос без просьбы написать код.`,
    ].join(' ');
  }

  return [
    `I don't write code or scripts here — this chat is for ${ticker}, not a general coding assistant.`,
    `I can explain return/P&L, price action, risks, or news for this ticker using Krepton context. Ask without requesting code.`,
  ].join(' ');
}

function buildGeneralAbuseRedirect(ticker: string, userMessage: string): string {
  if (prefersRussian(userMessage)) {
    return [
      `Я не общий ассистент — помогаю только с анализом ${ticker}.`,
      `Спроси про котировку, позицию, доходность, фундаментал или новости по этому тикеру.`,
    ].join(' ');
  }

  return [
    `I'm not a general-purpose assistant — I only help with ${ticker}.`,
    `Ask about the quote, your position, return, fundamentals, or news for this ticker.`,
  ].join(' ');
}

function buildAdviceRedirect(ticker: string, seedText: string): string {
  if (prefersRussian(seedText)) {
    return [
      `Не даю персональных указаний купить/продать и не обещаю результат по ${ticker}.`,
      `Могу разобрать цену, позицию, риски и контекст — без рекомендации к сделке.`,
    ].join(' ');
  }

  return [
    `I don't give personalized buy/sell instructions or promised outcomes for ${ticker}.`,
    `I can break down price, position, risks, and context — without a trade recommendation.`,
  ].join(' ');
}

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isCodingRequest(userMessage: string): boolean {
  return (
    CODE_REQUEST_PATTERN.test(userMessage) ||
    (PROGRAMMING_LANGUAGE_PATTERN.test(userMessage) &&
      /(код|code|script|программ|function|функци|snippet)/i.test(userMessage))
  );
}

/**
 * Steer coding-shaped asks toward the finance intent instead of hard-blocking.
 * Example: "python code for TTWO return" → still explain return, no code.
 */
function buildCodingSteerMessage(ticker: string, userMessage: string): string {
  return [
    userMessage,
    '',
    `[Product scope for the model: Do not write code, scripts, or APIs.`,
    `Answer only the market/finance intent for ${ticker} using quote/holding context.`,
    `If useful, briefly say this chat is for ticker analysis, not coding.]`,
  ].join('\n');
}

/**
 * Cheap input gate for obvious off-product requests.
 * Coding asks are steered (still answered on finance intent); pure general-assistant abuse is redirected.
 */
export function evaluateTickerChatInputScope(
  ticker: string,
  userMessage: string
): TickerChatScopeDecision {
  const normalizedMessage = userMessage.trim();
  const correctedMessage = correctFocusTickerTypos(ticker, normalizedMessage);

  if (GENERAL_ASSISTANT_ABUSE_PATTERN.test(correctedMessage)) {
    return {
      kind: 'soft_redirect',
      reply: buildGeneralAbuseRedirect(ticker, correctedMessage),
    };
  }

  if (isCodingRequest(correctedMessage)) {
    return {
      kind: 'allow',
      userMessage: buildCodingSteerMessage(ticker, correctedMessage),
    };
  }

  return { kind: 'allow', userMessage: correctedMessage };
}

/**
 * App-side output guardrail: inspect model text before it reaches the client.
 */
export function applyTickerChatOutputGuardrails(
  ticker: string,
  userMessage: string,
  reply: string
): TickerChatOutputGuardrailResult {
  if (PROGRAMMING_CODE_FENCE_PATTERN.test(reply)) {
    return {
      reply: buildCodingRedirect(ticker, userMessage),
      blockedReason: 'code',
    };
  }

  if (matchesAnyPattern(reply, PERSONALIZED_ADVICE_PATTERNS)) {
    return {
      reply: buildAdviceRedirect(ticker, `${userMessage}\n${reply}`),
      blockedReason: 'personalized_advice',
    };
  }

  if (matchesAnyPattern(reply, GUARANTEED_OUTCOME_PATTERNS)) {
    return {
      reply: buildAdviceRedirect(ticker, `${userMessage}\n${reply}`),
      blockedReason: 'guaranteed_outcome',
    };
  }

  return {
    reply,
    blockedReason: 'none',
  };
}

const MARKDOWN_INLINE_LINK_PATTERN = /\[([^\]]+)\]\(\s*https?:\/\/[^)\s]+\s*\)/gi;
const MARKDOWN_AUTOLINK_PATTERN = /<https?:\/\/[^>\s]+>/gi;
const BARE_HTTP_URL_PATTERN = /https?:\/\/[^\s<>)\]"'`]+/gi;

/**
 * Drop outbound URLs so the chat UI never renders third-party links (phishing / liability).
 * Markdown link labels are kept; bare URLs are removed.
 */
export function stripTickerChatOutboundLinks(reply: string): string {
  return reply
    .replace(MARKDOWN_INLINE_LINK_PATTERN, '$1')
    .replace(MARKDOWN_AUTOLINK_PATTERN, '')
    .replace(BARE_HTTP_URL_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Last-line defense before returning a model reply to the client.
 */
export function sanitizeTickerChatReply(
  ticker: string,
  userMessage: string,
  reply: string
): string {
  return stripTickerChatOutboundLinks(
    applyTickerChatOutputGuardrails(ticker, userMessage, reply).reply
  );
}
