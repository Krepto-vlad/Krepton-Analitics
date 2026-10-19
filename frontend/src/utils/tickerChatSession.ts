import {
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SESSION_MAX_COMPANY_NAME_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGE_ID_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGES,
  TICKER_CHAT_SESSION_MAX_TICKERS,
  TICKER_CHAT_SESSION_STORAGE_KEY,
  TICKER_FORMAT_PATTERN,
} from '../constants';
import type { TickerChatFactCheck, TickerChatUiMessage } from '../types/ai.types';

export interface TickerChatSessionSnapshot {
  messages: TickerChatUiMessage[];
  draft: string;
}

interface StoredTickerChatThread {
  messages: TickerChatUiMessage[];
  draft: string;
  updatedAtMs: number;
}

export interface TickerChatActiveTarget {
  ticker: string;
  companyName: string;
}

interface StoredTickerChatSession {
  threads: Record<string, StoredTickerChatThread>;
  activeTicker?: string;
  activeCompanyName?: string;
}

const EMPTY_SNAPSHOT: TickerChatSessionSnapshot = {
  messages: [],
  draft: '',
};

function readTickerSymbol(ticker: string): string | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!TICKER_FORMAT_PATTERN.test(normalizedTicker)) {
    return null;
  }

  return normalizedTicker;
}

function readCompanyName(companyName: string, ticker: string): string {
  return companyName.trim().slice(0, TICKER_CHAT_SESSION_MAX_COMPANY_NAME_CHARS) || ticker;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function readFactCheck(value: unknown): TickerChatFactCheck | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const factCheck = value as TickerChatFactCheck;
  if (
    typeof factCheck.quoteVerified !== 'boolean' ||
    typeof factCheck.holdingVerified !== 'boolean' ||
    typeof factCheck.corrected !== 'boolean' ||
    !isNullableNumber(factCheck.livePrice) ||
    !isNullableString(factCheck.currency) ||
    !isNullableNumber(factCheck.changePercent) ||
    !isNullableNumber(factCheck.shares) ||
    !isNullableNumber(factCheck.avgBuyPrice)
  ) {
    return undefined;
  }

  return {
    quoteVerified: factCheck.quoteVerified,
    holdingVerified: factCheck.holdingVerified,
    corrected: factCheck.corrected,
    livePrice: factCheck.livePrice,
    currency: factCheck.currency,
    changePercent: factCheck.changePercent,
    shares: factCheck.shares,
    avgBuyPrice: factCheck.avgBuyPrice,
  };
}

function readMessage(value: unknown): TickerChatUiMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const message = value as TickerChatUiMessage;
  if (
    (message.role !== 'user' && message.role !== 'assistant') ||
    typeof message.id !== 'string' ||
    typeof message.content !== 'string'
  ) {
    return null;
  }

  const messageId = message.id.trim().slice(0, TICKER_CHAT_SESSION_MAX_MESSAGE_ID_CHARS);
  const content = message.content.slice(0, TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS);
  if (!messageId || !content.trim()) {
    return null;
  }

  const restoredMessage: TickerChatUiMessage = {
    id: messageId,
    role: message.role,
    content,
  };
  if (typeof message.groundingEnabled === 'boolean') {
    restoredMessage.groundingEnabled = message.groundingEnabled;
  }

  const factCheck = readFactCheck(message.factCheck);
  if (factCheck) {
    restoredMessage.factCheck = factCheck;
  }

  return restoredMessage;
}

function readStoredMessages(messages: unknown): TickerChatUiMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => readMessage(message))
    .filter((message): message is TickerChatUiMessage => message !== null)
    .slice(-TICKER_CHAT_SESSION_MAX_MESSAGES);
}

function readStoredDraft(draft: unknown): string {
  return typeof draft === 'string' ? draft.slice(0, TICKER_CHAT_MAX_MESSAGE_CHARS) : '';
}

function updateStoredSession(updateStore: (store: StoredTickerChatSession) => void): void {
  try {
    const store = readStore();
    updateStore(store);
    writeStore(store);
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

function emptyStore(): StoredTickerChatSession {
  return { threads: {} };
}

function readStore(): StoredTickerChatSession {
  try {
    const storedSessionJson = sessionStorage.getItem(TICKER_CHAT_SESSION_STORAGE_KEY);
    if (!storedSessionJson) {
      return emptyStore();
    }

    const parsedSession = JSON.parse(storedSessionJson) as StoredTickerChatSession;
    if (!parsedSession || typeof parsedSession !== 'object' || Array.isArray(parsedSession)) {
      sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
      return emptyStore();
    }

    const threads =
      parsedSession.threads &&
      typeof parsedSession.threads === 'object' &&
      !Array.isArray(parsedSession.threads)
        ? parsedSession.threads
        : {};

    return {
      threads,
      activeTicker:
        typeof parsedSession.activeTicker === 'string' ? parsedSession.activeTicker : undefined,
      activeCompanyName:
        typeof parsedSession.activeCompanyName === 'string'
          ? parsedSession.activeCompanyName
          : undefined,
    };
  } catch {
    sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
    return emptyStore();
  }
}

function pruneThreads(store: StoredTickerChatSession): void {
  const tickers = Object.keys(store.threads);
  if (tickers.length <= TICKER_CHAT_SESSION_MAX_TICKERS) {
    return;
  }

  const oldestFirst = [...tickers].sort(
    (leftTicker, rightTicker) =>
      store.threads[leftTicker].updatedAtMs - store.threads[rightTicker].updatedAtMs
  );
  const overflowCount = tickers.length - TICKER_CHAT_SESSION_MAX_TICKERS;
  for (const ticker of oldestFirst.slice(0, overflowCount)) {
    delete store.threads[ticker];
  }
}

function writeStore(store: StoredTickerChatSession): void {
  if (Object.keys(store.threads).length === 0 && !store.activeTicker) {
    sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(TICKER_CHAT_SESSION_STORAGE_KEY, JSON.stringify(store));
}

export function loadTickerChatSession(ticker: string): TickerChatSessionSnapshot {
  const tickerSymbol = readTickerSymbol(ticker);
  if (!tickerSymbol) {
    return EMPTY_SNAPSHOT;
  }

  const thread = readStore().threads[tickerSymbol];
  if (!thread) {
    return EMPTY_SNAPSHOT;
  }

  return {
    messages: readStoredMessages(thread.messages),
    draft: readStoredDraft(thread.draft),
  };
}

export function saveTickerChatSession(
  ticker: string,
  messages: TickerChatUiMessage[],
  draft: string
): void {
  const tickerSymbol = readTickerSymbol(ticker);
  if (!tickerSymbol) {
    return;
  }

  const storedMessages = readStoredMessages(messages);
  const storedDraft = readStoredDraft(draft);

  updateStoredSession((store) => {
    if (storedMessages.length === 0 && storedDraft.trim().length === 0) {
      delete store.threads[tickerSymbol];
    } else {
      store.threads[tickerSymbol] = {
        messages: storedMessages,
        draft: storedDraft,
        updatedAtMs: Date.now(),
      };
    }

    pruneThreads(store);
  });
}

export function loadActiveTickerChat(): TickerChatActiveTarget | null {
  const store = readStore();
  const ticker = readTickerSymbol(store.activeTicker ?? '');
  if (!ticker) {
    return null;
  }

  return {
    ticker,
    companyName: readCompanyName(store.activeCompanyName ?? '', ticker),
  };
}

export function saveActiveTickerChat(ticker: string, companyName: string): void {
  const tickerSymbol = readTickerSymbol(ticker);
  if (!tickerSymbol) {
    return;
  }

  const storedCompanyName = readCompanyName(companyName, tickerSymbol);
  updateStoredSession((store) => {
    store.activeTicker = tickerSymbol;
    store.activeCompanyName = storedCompanyName;
  });
}

export function clearTickerChatSession(): void {
  try {
    sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
  } catch {
    // Ignore private-mode storage errors.
  }
}
