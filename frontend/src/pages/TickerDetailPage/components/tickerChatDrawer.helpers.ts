import {
  BACKTEST_PERIODS,
  STOCK_PERIODS,
  TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
  TICKER_CHAT_DRAWER_MIN_WIDTH_PX,
  TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY,
  TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS,
  TICKER_CHAT_MAX_HISTORY_MESSAGES,
  TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS,
  TICKER_CHAT_PERSONAL_SCREEN_KINDS,
  TICKER_CHAT_SCREEN_BACKTEST_BENCHMARK_MESSAGE,
  TICKER_CHAT_SCREEN_BACKTEST_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_DIFFERENCES_MESSAGE,
  TICKER_CHAT_SCREEN_DIVIDENDS_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_DIVIDENDS_MONTHS_MESSAGE,
  TICKER_CHAT_SCREEN_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_NEWS_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_NEWS_MENTIONS_MESSAGE,
  TICKER_CHAT_SCREEN_PORTFOLIO_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_PORTFOLIO_LARGEST_MESSAGE,
  TICKER_CHAT_SCREEN_MOVERS_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_MOVERS_STANDOUT_MESSAGE,
  TICKER_CHAT_SCREEN_REBALANCING_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_REBALANCING_NEAREST_MESSAGE,
  TICKER_CHAT_SCREEN_TICKER_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_TICKER_FUNDAMENTALS_MESSAGE,
  TICKER_CHAT_SCREEN_WATCHLIST_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_WATCHLIST_MOVED_MESSAGE,
  TICKER_CHAT_SUGGESTION_PROMPTS,
} from '../../../constants';
import type {
  AiQuotaStatus,
  GenerateTickerChatPayload,
  TickerChatFactCheck,
  TickerChatHistoryMessage,
  TickerChatUiMessage,
} from '../../../types/ai.types';
import { toVisibleTickerChatMessage } from '../../../utils/tickerChatSession';
import type { ChatScreenContext } from '../../../utils/tickerChatSession';

export function formatAllocationWeight(weightPercent: number): string {
  const roundedWeight = Math.round(weightPercent * 10) / 10;
  return Number.isInteger(roundedWeight) ? `${roundedWeight}%` : `${roundedWeight.toFixed(1)}%`;
}

export function screenContextView(screenContext: ChatScreenContext): {
  label: string;
  actions: Array<{ label: string; message: string }>;
} {
  if (screenContext.kind === 'compare') {
    return {
      label: `Comparison: ${screenContext.tickers.map((item) => item.ticker).join(', ')}`,
      actions: [
        { label: 'Explain this comparison', message: TICKER_CHAT_SCREEN_EXPLAIN_MESSAGE },
        { label: 'Explain the differences', message: TICKER_CHAT_SCREEN_DIFFERENCES_MESSAGE },
      ],
    };
  }

  if (screenContext.kind === 'backtest') {
    const periodLabel =
      BACKTEST_PERIODS.find((period) => period.value === screenContext.period)?.label ??
      screenContext.period;
    const allocationLabel = screenContext.allocations
      .map(
        (allocation) => `${allocation.ticker} ${formatAllocationWeight(allocation.weightPercent)}`
      )
      .join(' · ');

    return {
      label: `Backtest: ${allocationLabel} · ${periodLabel}`,
      actions: [
        { label: 'Explain this backtest', message: TICKER_CHAT_SCREEN_BACKTEST_EXPLAIN_MESSAGE },
        {
          label: 'How did it compare with the S&P 500',
          message: TICKER_CHAT_SCREEN_BACKTEST_BENCHMARK_MESSAGE,
        },
      ],
    };
  }

  if (screenContext.kind === 'dividends') {
    return {
      label: 'Dividend calendar',
      actions: [
        {
          label: 'Explain this calendar',
          message: TICKER_CHAT_SCREEN_DIVIDENDS_EXPLAIN_MESSAGE,
        },
        {
          label: 'Which months pay the most',
          message: TICKER_CHAT_SCREEN_DIVIDENDS_MONTHS_MESSAGE,
        },
      ],
    };
  }

  if (screenContext.kind === 'ticker') {
    const periodLabel =
      STOCK_PERIODS.find((period) => period.value === screenContext.period)?.label ??
      screenContext.period;
    return {
      label: `Chart: ${periodLabel}`,
      actions: [
        { label: 'Explain this chart', message: TICKER_CHAT_SCREEN_TICKER_EXPLAIN_MESSAGE },
        {
          label: 'What do the fundamentals say',
          message: TICKER_CHAT_SCREEN_TICKER_FUNDAMENTALS_MESSAGE,
        },
      ],
    };
  }

  if (screenContext.kind === 'portfolio') {
    return {
      label: 'Portfolio weights',
      actions: [
        { label: 'Explain these weights', message: TICKER_CHAT_SCREEN_PORTFOLIO_EXPLAIN_MESSAGE },
        {
          label: 'Which holdings are largest',
          message: TICKER_CHAT_SCREEN_PORTFOLIO_LARGEST_MESSAGE,
        },
      ],
    };
  }

  if (screenContext.kind === 'news') {
    return {
      label: 'Portfolio news',
      actions: [
        { label: 'Explain these headlines', message: TICKER_CHAT_SCREEN_NEWS_EXPLAIN_MESSAGE },
        { label: 'What mentions my holdings', message: TICKER_CHAT_SCREEN_NEWS_MENTIONS_MESSAGE },
      ],
    };
  }

  if (screenContext.kind === 'watchlist') {
    return {
      label: 'Watchlist',
      actions: [
        { label: 'Explain this watchlist', message: TICKER_CHAT_SCREEN_WATCHLIST_EXPLAIN_MESSAGE },
        { label: 'What moved today', message: TICKER_CHAT_SCREEN_WATCHLIST_MOVED_MESSAGE },
      ],
    };
  }

  if (screenContext.kind === 'rebalancing') {
    return {
      label: 'Rebalancing target',
      actions: [
        { label: 'Explain this drift', message: TICKER_CHAT_SCREEN_REBALANCING_EXPLAIN_MESSAGE },
        {
          label: 'What is nearest the target',
          message: TICKER_CHAT_SCREEN_REBALANCING_NEAREST_MESSAGE,
        },
      ],
    };
  }

  return {
    label: 'Market movers',
    actions: [
      { label: "Explain today's movers", message: TICKER_CHAT_SCREEN_MOVERS_EXPLAIN_MESSAGE },
      { label: 'What stands out', message: TICKER_CHAT_SCREEN_MOVERS_STANDOUT_MESSAGE },
    ],
  };
}

const HISTORY_TRUNCATION_SUFFIX = '…';
const TICKER_PLACEHOLDER = '{ticker}';

export function clampDrawerWidth(widthPx: number): number {
  return Math.min(
    TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
    Math.max(TICKER_CHAT_DRAWER_MIN_WIDTH_PX, widthPx)
  );
}

export function createMessageId(): string {
  return crypto.randomUUID();
}

export function formatQuotaLabel(quota: AiQuotaStatus | null): string {
  if (!quota) {
    return 'Quota unavailable';
  }

  return `${quota.remaining}/${quota.limit} left today`;
}

export function readIncludeHoldingContext(): boolean {
  try {
    const storedValue = localStorage.getItem(TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY);
    if (storedValue === null) {
      return true;
    }

    return storedValue === 'true';
  } catch {
    return true;
  }
}

export function writeIncludeHoldingContext(value: boolean): void {
  try {
    localStorage.setItem(TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Private-mode storage can throw; the in-memory checkbox still works.
  }
}

export function isPersonalScreen(screenContext: ChatScreenContext): boolean {
  return (TICKER_CHAT_PERSONAL_SCREEN_KINDS as readonly string[]).includes(screenContext.kind);
}

export function formatChatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatChatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatFactCheckQuote(factCheck: TickerChatFactCheck): string | null {
  if (
    factCheck.livePrice === null ||
    factCheck.currency === null ||
    factCheck.changePercent === null
  ) {
    return null;
  }

  const quoteLine = `${formatChatMoney(factCheck.currency, factCheck.livePrice)} (${formatChatPercent(factCheck.changePercent)})`;
  if (factCheck.shares === null || factCheck.avgBuyPrice === null) {
    return quoteLine;
  }

  return `${quoteLine} · ${factCheck.shares} sh @ ${formatChatMoney(factCheck.currency, factCheck.avgBuyPrice)}`;
}

export function truncateChatText(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const sliceLength = Math.max(0, maxChars - HISTORY_TRUNCATION_SUFFIX.length);
  return `${content.slice(0, sliceLength).trimEnd()}${HISTORY_TRUNCATION_SUFFIX}`;
}

/** Build API history: newest turns first within char budget; UI keeps full text. */
export function buildRequestHistory(messages: TickerChatUiMessage[]): TickerChatHistoryMessage[] {
  const recentMessages = messages.slice(-TICKER_CHAT_MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: truncateChatText(
      message.role === 'user' ? toVisibleTickerChatMessage(message.content) : message.content,
      TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS
    ),
  }));

  const keptNewestFirst: TickerChatHistoryMessage[] = [];
  let usedChars = 0;

  for (let index = recentMessages.length - 1; index >= 0; index -= 1) {
    const message = recentMessages[index];
    const nextTotal = usedChars + message.content.length;
    if (keptNewestFirst.length > 0 && nextTotal > TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS) {
      break;
    }

    keptNewestFirst.push(message);
    usedChars = nextTotal;
  }

  return keptNewestFirst.reverse();
}

export function buildScreenContextPayload(
  screenContext: ChatScreenContext
): GenerateTickerChatPayload['screenContext'] {
  if (screenContext.kind === 'compare') {
    return {
      kind: 'compare',
      tickers: screenContext.tickers.map((item) => item.ticker),
    };
  }

  if (screenContext.kind === 'rebalancing') {
    return {
      kind: 'rebalancing',
      displayCurrency: screenContext.displayCurrency,
    };
  }

  if (screenContext.kind === 'movers') {
    return { kind: 'movers' };
  }

  if (screenContext.kind === 'backtest') {
    return {
      kind: 'backtest',
      period: screenContext.period,
      amount: screenContext.amount,
      displayCurrency: screenContext.displayCurrency,
      allocations: screenContext.allocations.map((allocation) => ({
        ticker: allocation.ticker,
        weightPercent: allocation.weightPercent,
      })),
    };
  }

  if (screenContext.kind === 'dividends') {
    return {
      kind: 'dividends',
      displayCurrency: screenContext.displayCurrency,
    };
  }

  if (screenContext.kind === 'ticker') {
    return {
      kind: 'ticker',
      period: screenContext.period,
    };
  }

  if (screenContext.kind === 'portfolio') {
    return {
      kind: 'portfolio',
      displayCurrency: screenContext.displayCurrency,
    };
  }

  if (screenContext.kind === 'news') {
    return { kind: 'news' };
  }

  return { kind: 'watchlist' };
}

export function buildSuggestionPrompts(ticker: string): string[] {
  return TICKER_CHAT_SUGGESTION_PROMPTS.map((prompt) =>
    prompt.replaceAll(TICKER_PLACEHOLDER, ticker)
  );
}

export function readElementTranslateX(element: HTMLElement): number {
  const transformValue = window.getComputedStyle(element).transform;
  if (!transformValue || transformValue === 'none') {
    return 0;
  }

  try {
    return new DOMMatrixReadOnly(transformValue).m41;
  } catch {
    return 0;
  }
}
