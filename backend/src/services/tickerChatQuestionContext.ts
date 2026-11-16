import {
  AI_TICKER_CHAT_COMPANY_ALIASES,
  AI_TICKER_CHAT_IGNORED_SYMBOLS,
  AI_TICKER_CHAT_QUESTION_MAX_SEARCHES,
  AI_TICKER_CHAT_QUESTION_MAX_TICKERS,
} from '../constants.js';
import type { TickerChatDisplayBlock } from '../types/ai.types.js';
import type { StockCompareItem, StockQuote } from '../types/stock.types.js';
import { isValidTickerSymbol } from '../utils/tickerValidation.js';
import { logger } from '../utils/logger.js';
import { getCachedStockQuotes } from './quoteCacheService.js';
import { getStockCompare, searchStocks } from './stockService.js';
import { buildTickerChatCompareScreen } from './tickerChatScreenContext.js';

const QUESTION_TOKEN_PATTERN = /[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9.\-=^]*/g;
const COMPARE_INTENT_PATTERN = /\b(compare|comparison|versus|vs\.?)\b|сравн/iu;
const LATIN_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9.&-]{2,}$/;
const SEARCH_MIN_LENGTH = 4;
const IGNORED_SYMBOLS = new Set<string>(AI_TICKER_CHAT_IGNORED_SYMBOLS);
const SEARCH_STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'all',
  'also',
  'and',
  'another',
  'any',
  'are',
  'back',
  'backtest',
  'been',
  'best',
  'both',
  'calendar',
  'can',
  'chart',
  'company',
  'compare',
  'comparison',
  'could',
  'describe',
  'did',
  'does',
  'doing',
  'down',
  'drift',
  'each',
  'explain',
  'for',
  'from',
  'give',
  'good',
  'has',
  'have',
  'headlines',
  'help',
  'high',
  'holding',
  'holdings',
  'how',
  'into',
  'its',
  'just',
  'last',
  'latest',
  'like',
  'look',
  'looks',
  'low',
  'make',
  'many',
  'market',
  'metrics',
  'month',
  'more',
  'most',
  'move',
  'moved',
  'movers',
  'much',
  'news',
  'next',
  'not',
  'now',
  'only',
  'open',
  'other',
  'over',
  'page',
  'paths',
  'please',
  'portfolio',
  'position',
  'price',
  'prices',
  'risk',
  'risks',
  'screen',
  'share',
  'shares',
  'should',
  'show',
  'some',
  'stock',
  'stocks',
  'such',
  'summarize',
  'summary',
  'tell',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'ticker',
  'today',
  'under',
  'using',
  'versus',
  'very',
  'want',
  'watch',
  'watchlist',
  'week',
  'weights',
  'well',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'year',
  'your',
]);

export interface QuestionMarketContext {
  promptText: string | null;
  referencePrices: number[];
  displayBlocks: TickerChatDisplayBlock[];
  chartTicker: string | null;
  focusTicker: string | null;
  focusPrice: number | null;
  focusCurrency: string | null;
  focusChangePercent: number | null;
}

const EMPTY_QUESTION_MARKET: QuestionMarketContext = {
  promptText: null,
  referencePrices: [],
  displayBlocks: [],
  chartTicker: null,
  focusTicker: null,
  focusPrice: null,
  focusCurrency: null,
  focusChangePercent: null,
};

interface QuestionMention {
  index: number;
  ticker?: string;
  searchQuery?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function readExplicitTicker(token: string): string | null {
  if (token !== token.toUpperCase() || !isValidTickerSymbol(token)) {
    return null;
  }

  if (IGNORED_SYMBOLS.has(token) || token.length < 2) {
    return null;
  }

  return token;
}

function collectAliasMentions(message: string): QuestionMention[] {
  const mentions: QuestionMention[] = [];
  const lowerMessage = message.toLowerCase();

  for (const alias of AI_TICKER_CHAT_COMPANY_ALIASES) {
    for (const name of alias.names) {
      const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])(${escapeRegExp(name)})(?=$|[^\\p{L}\\p{N}])`,
        'giu'
      );
      for (const match of lowerMessage.matchAll(pattern)) {
        const nameIndex = match.index ?? 0;
        const prefixLength = match[1]?.length ?? 0;
        mentions.push({ index: nameIndex + prefixLength, ticker: alias.ticker });
      }
    }
  }

  return mentions;
}

function collectTokenMentions(message: string): QuestionMention[] {
  const mentions: QuestionMention[] = [];

  for (const match of message.matchAll(QUESTION_TOKEN_PATTERN)) {
    const token = match[0];
    const index = match.index ?? 0;
    const ticker = readExplicitTicker(token);
    if (ticker) {
      mentions.push({ index, ticker });
      continue;
    }

    if (!LATIN_NAME_PATTERN.test(token) || token.length < SEARCH_MIN_LENGTH) {
      continue;
    }

    if (SEARCH_STOPWORDS.has(token.toLowerCase())) {
      continue;
    }

    mentions.push({ index, searchQuery: token });
  }

  return mentions;
}

function mentionsOverlap(left: QuestionMention, right: QuestionMention, message: string): boolean {
  const leftLength = (left.ticker ?? left.searchQuery ?? '').length;
  const rightLength = (right.ticker ?? right.searchQuery ?? '').length;
  const leftEnd = left.index + Math.max(leftLength, 1);
  const rightEnd = right.index + Math.max(rightLength, 1);
  if (leftEnd <= right.index || rightEnd <= left.index) {
    return false;
  }

  return left.index < message.length && right.index < message.length;
}

function mergeMentions(message: string): QuestionMention[] {
  const aliasMentions = collectAliasMentions(message);
  const tokenMentions = collectTokenMentions(message).filter(
    (mention) => !aliasMentions.some((alias) => mentionsOverlap(alias, mention, message))
  );

  return [...aliasMentions, ...tokenMentions].sort(
    (left, right) => left.index - right.index || (right.ticker ? 1 : 0) - (left.ticker ? 1 : 0)
  );
}

async function searchTickerName(query: string): Promise<string | null> {
  try {
    const results = await searchStocks(query);
    const normalizedQuery = query.toLowerCase();
    const match = results.find((result) => {
      const ticker = result.ticker.trim().toUpperCase();
      const name = result.name.toLowerCase();
      return (
        isValidTickerSymbol(ticker) &&
        (ticker.toLowerCase() === normalizedQuery || name.includes(normalizedQuery))
      );
    });
    return match ? match.ticker.trim().toUpperCase() : null;
  } catch (error) {
    logger.warn({ err: error, query }, 'Ticker chat name search failed');
    return null;
  }
}

async function resolveMentionedTickers(message: string): Promise<string[]> {
  const tickers: string[] = [];
  let searchCount = 0;
  let usedLowercaseSearch = false;

  for (const mention of mergeMentions(message)) {
    if (tickers.length >= AI_TICKER_CHAT_QUESTION_MAX_TICKERS) {
      break;
    }

    if (mention.ticker) {
      if (!tickers.includes(mention.ticker)) {
        tickers.push(mention.ticker);
      }
      continue;
    }

    const query = mention.searchQuery;
    if (!query || searchCount >= AI_TICKER_CHAT_QUESTION_MAX_SEARCHES) {
      continue;
    }

    const isCapitalized =
      query[0] === query[0]?.toUpperCase() && query[0] !== query[0]?.toLowerCase();
    if (!isCapitalized && (tickers.length > 0 || usedLowercaseSearch)) {
      continue;
    }

    searchCount += 1;
    if (!isCapitalized) {
      usedLowercaseSearch = true;
    }

    const ticker = await searchTickerName(query);
    if (ticker && !tickers.includes(ticker)) {
      tickers.push(ticker);
    }
  }

  return tickers;
}

function buildQuoteLines(quotes: StockQuote[]): string[] {
  return quotes.map((quote) => {
    const name = quote.name.trim() || quote.ticker;
    const currency = quote.currency || 'USD';
    return `- ${quote.ticker} (${name}): ${currency} ${quote.price.toFixed(2)} (${formatSignedPercent(quote.changePercent)}).`;
  });
}

function readCompareMetricLines(items: StockCompareItem[]): string[] {
  return buildTickerChatCompareScreen(items)
    .promptText.split('\n')
    .filter((line) => line.startsWith('- '));
}

function selectChartTicker(quotes: StockQuote[], pageTicker: string | null): string | null {
  const pageSymbol = pageTicker?.trim().toUpperCase() ?? '';
  const offScreen = quotes.find((quote) => quote.ticker.toUpperCase() !== pageSymbol);
  return offScreen ? offScreen.ticker.toUpperCase() : null;
}

/**
 * Fresh quotes for companies the user named. The open page is not the subject.
 * At most three symbols, so a long message cannot fan out into Yahoo.
 */
export async function resolveQuestionMarket(
  message: string,
  pageTicker: string | null
): Promise<QuestionMarketContext> {
  const tickers = await resolveMentionedTickers(message);
  if (tickers.length === 0) {
    return EMPTY_QUESTION_MARKET;
  }

  let quotes: StockQuote[] = [];
  try {
    const fetchedQuotes = await getCachedStockQuotes(tickers);
    quotes = fetchedQuotes.filter((quote) => quote.price > 0);
  } catch (error) {
    logger.warn({ err: error, tickers }, 'Ticker chat question quotes failed');
    return EMPTY_QUESTION_MARKET;
  }

  if (quotes.length === 0) {
    return EMPTY_QUESTION_MARKET;
  }

  const quoteTickers = quotes.map((quote) => quote.ticker.toUpperCase());
  let displayBlocks: TickerChatDisplayBlock[] = [];
  let compareLines: string[] = [];
  let comparePrices: number[] = [];
  const wantsComparison = COMPARE_INTENT_PATTERN.test(message) && quoteTickers.length >= 2;

  if (wantsComparison) {
    try {
      const comparison = await getStockCompare(quoteTickers);
      const compareScreen = buildTickerChatCompareScreen(comparison.items);
      displayBlocks = compareScreen.displayBlocks;
      compareLines = readCompareMetricLines(comparison.items);
      comparePrices = compareScreen.referencePrices;
    } catch (error) {
      logger.warn({ err: error, tickers: quoteTickers }, 'Ticker chat question compare failed');
    }
  }

  const referencePrices = [
    ...quotes.map((quote) => quote.price),
    ...comparePrices.filter((price) => Number.isFinite(price)),
  ];

  const promptText = [
    'QUESTION MARKET DATA — fresh Krepton quotes for the companies named in this message.',
    'Answer about these companies. These are the only prices you may state for them.',
    'Do not reuse prices from earlier chat messages.',
    ...buildQuoteLines(quotes),
    ...(compareLines.length > 0
      ? ['Comparison metrics for the companies named in the question:', ...compareLines]
      : []),
  ].join('\n');

  const focusQuote = quotes[0];

  return {
    promptText,
    referencePrices,
    displayBlocks,
    chartTicker: selectChartTicker(quotes, pageTicker),
    focusTicker: focusQuote ? focusQuote.ticker.toUpperCase() : null,
    focusPrice: focusQuote?.price ?? null,
    focusCurrency: focusQuote?.currency || 'USD',
    focusChangePercent: focusQuote?.changePercent ?? null,
  };
}
