import {
  BACKTEST_ALLOCATION_TOLERANCE,
  BACKTEST_ALLOCATION_TOTAL_PERCENT,
  BACKTEST_MAX_AMOUNT,
  BACKTEST_MAX_TICKERS,
  BACKTEST_MIN_AMOUNT,
  BACKTEST_PERIODS,
  CURRENCY_OPTIONS,
  STOCK_COMPARE_MAX_TICKERS,
  STOCK_COMPARE_MIN_TICKERS,
  TICKER_CHAT_COMPARE_BAR_METRIC_KEYS,
  TICKER_CHAT_COMPARE_BAR_MIN_ROWS,
  TICKER_CHAT_COMPARE_BAR_UNITS,
  TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS,
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_MODEL_ONLY_SENTENCE,
  TICKER_CHAT_SCREEN_HEADLINE_MAX_CHARS,
  TICKER_CHAT_SCREEN_BACKTEST_KIND,
  TICKER_CHAT_SCREEN_COMPARE_KIND,
  TICKER_CHAT_SCREEN_CONTEXT_EVENT,
  TICKER_CHAT_SCREEN_DIVIDENDS_KIND,
  TICKER_CHAT_SCREEN_MAX_ROWS,
  TICKER_CHAT_SCREEN_MOVERS_KIND,
  TICKER_CHAT_SCREEN_NEWS_KIND,
  TICKER_CHAT_SCREEN_PORTFOLIO_KIND,
  TICKER_CHAT_SCREEN_REBALANCING_KIND,
  TICKER_CHAT_SCREEN_TICKER_KIND,
  TICKER_CHAT_SCREEN_WATCHLIST_KIND,
  TICKER_CHAT_ARCHIVED_THREAD_LIMIT,
  TICKER_CHAT_SESSION_MAX_COMPANY_NAME_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGE_ID_CHARS,
  TICKER_CHAT_SESSION_MAX_MESSAGES,
  TICKER_CHAT_SESSION_MAX_TICKERS,
  TICKER_CHAT_SESSION_STORAGE_KEY,
  TICKER_FORMAT_PATTERN,
  STOCK_PERIODS,
  type BacktestPeriod,
  type Currency,
  type StockChartPeriod,
} from '../constants';
import type {
  TickerChatAllocationBarRow,
  TickerChatBacktestBarRow,
  TickerChatCompareBarRow,
  TickerChatPayoutBarRow,
  TickerChatDisplayBlock,
  TickerChatFactCheck,
  TickerChatHeadlineRow,
  TickerChatMoverBarRow,
  TickerChatUiMessage,
  TickerChatWeightBarRow,
} from '../types/ai.types';

export interface ChatCompareScreenTicker {
  ticker: string;
  name: string;
}

export interface ChatCompareScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_COMPARE_KIND;
  tickers: ChatCompareScreenTicker[];
}

export interface ChatRebalancingScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_REBALANCING_KIND;
  displayCurrency: Currency;
}

export interface ChatMoversScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_MOVERS_KIND;
}

export interface ChatBacktestAllocation {
  ticker: string;
  name: string;
  weightPercent: number;
}

export interface ChatBacktestScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_BACKTEST_KIND;
  period: BacktestPeriod;
  amount: number;
  displayCurrency: Currency;
  allocations: ChatBacktestAllocation[];
}

export interface ChatDividendsScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_DIVIDENDS_KIND;
  displayCurrency: Currency;
}

export interface ChatTickerScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_TICKER_KIND;
  period: StockChartPeriod;
}

export interface ChatPortfolioScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_PORTFOLIO_KIND;
  displayCurrency: Currency;
}

export interface ChatNewsScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_NEWS_KIND;
}

export interface ChatWatchlistScreenContext {
  kind: typeof TICKER_CHAT_SCREEN_WATCHLIST_KIND;
}

export type ChatScreenContext =
  | ChatCompareScreenContext
  | ChatRebalancingScreenContext
  | ChatMoversScreenContext
  | ChatBacktestScreenContext
  | ChatDividendsScreenContext
  | ChatTickerScreenContext
  | ChatPortfolioScreenContext
  | ChatNewsScreenContext
  | ChatWatchlistScreenContext;

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
  appThread?: StoredTickerChatThread;
  archivedThreads?: StoredTickerChatThread[];
  activeTicker?: string;
  activeCompanyName?: string;
  screenContext?: ChatScreenContext;
  lastVisitedTicker?: string;
  lastVisitedCompanyName?: string;
  compareOfferTicker?: string;
  compareOfferCompanyName?: string;
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

/** Drop the model-only sentence so a saved thread never shows it again. */
export function toVisibleTickerChatMessage(content: string): string {
  return content
    .replaceAll(TICKER_CHAT_MODEL_ONLY_SENTENCE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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
  const visibleContent =
    message.role === 'user' ? toVisibleTickerChatMessage(message.content) : message.content;
  const content = visibleContent.slice(0, TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS);
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

  const displayBlocks = readDisplayBlocks(message.displayBlocks);
  if (displayBlocks.length > 0) {
    restoredMessage.displayBlocks = displayBlocks;
  }

  if (typeof message.chartTicker === 'string') {
    const chartTicker = readTickerSymbol(message.chartTicker);
    if (chartTicker) {
      restoredMessage.chartTicker = chartTicker;
    }
  }

  return restoredMessage;
}

function readCompareBarRow(value: unknown): TickerChatCompareBarRow | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as TickerChatCompareBarRow;
  const ticker = readTickerSymbol(row.ticker ?? '');
  if (!ticker || typeof row.name !== 'string') {
    return null;
  }

  if (row.value !== null && (typeof row.value !== 'number' || !Number.isFinite(row.value))) {
    return null;
  }

  return {
    ticker,
    name: readCompanyName(row.name, ticker),
    value: row.value,
  };
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBlockTitle(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const title = value.trim().slice(0, TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS);
  return title.length > 0 ? title : null;
}

function readAllocationBarRow(value: unknown): TickerChatAllocationBarRow | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as TickerChatAllocationBarRow;
  const currentPercent = readFiniteNumber(row.currentPercent);
  const targetPercent = readFiniteNumber(row.targetPercent);
  if (typeof row.label !== 'string' || currentPercent === null || targetPercent === null) {
    return null;
  }

  const label = row.label.trim().slice(0, TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS);
  if (!label) {
    return null;
  }

  return { label, currentPercent, targetPercent };
}

function readMoverBarRow(value: unknown): TickerChatMoverBarRow | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as TickerChatMoverBarRow;
  const ticker = readTickerSymbol(row.ticker ?? '');
  const changePercent = readFiniteNumber(row.changePercent);
  if (!ticker || typeof row.name !== 'string' || changePercent === null) {
    return null;
  }

  return {
    ticker,
    name: readCompanyName(row.name, ticker),
    changePercent,
  };
}

function readCompareBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'compare-bars') {
    return null;
  }

  const metricKey = TICKER_CHAT_COMPARE_BAR_METRIC_KEYS.find((key) => key === block.metricKey);
  const unit = TICKER_CHAT_COMPARE_BAR_UNITS.find((candidate) => candidate === block.unit);
  const title = readBlockTitle(block.title);
  if (!metricKey || !unit || !title) {
    return null;
  }

  const rows = Array.isArray(block.rows)
    ? block.rows
        .map((row) => readCompareBarRow(row))
        .filter((row): row is TickerChatCompareBarRow => row !== null)
        .slice(0, STOCK_COMPARE_MAX_TICKERS)
    : [];
  if (rows.length < TICKER_CHAT_COMPARE_BAR_MIN_ROWS) {
    return null;
  }

  return { kind: 'compare-bars', metricKey, title, unit, rows };
}

function readAllocationBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'allocation-bars') {
    return null;
  }

  const title = readBlockTitle(block.title);
  if (!title) {
    return null;
  }

  const rows = Array.isArray(block.rows)
    ? block.rows
        .map((row) => readAllocationBarRow(row))
        .filter((row): row is TickerChatAllocationBarRow => row !== null)
        .slice(0, TICKER_CHAT_SCREEN_MAX_ROWS)
    : [];
  if (rows.length === 0) {
    return null;
  }

  return { kind: 'allocation-bars', title, rows };
}

function readMoverBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'mover-bars' || (block.side !== 'gainers' && block.side !== 'losers')) {
    return null;
  }

  const title = readBlockTitle(block.title);
  if (!title) {
    return null;
  }

  const rows = Array.isArray(block.rows)
    ? block.rows
        .map((row) => readMoverBarRow(row))
        .filter((row): row is TickerChatMoverBarRow => row !== null)
        .slice(0, TICKER_CHAT_SCREEN_MAX_ROWS)
    : [];

  return { kind: 'mover-bars', title, side: block.side, rows };
}

function readBacktestBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'backtest-bars') {
    return null;
  }

  const title = readBlockTitle(block.title);
  if (!title || !Array.isArray(block.rows)) {
    return null;
  }

  const rows: TickerChatBacktestBarRow[] = [];
  for (const rawRow of block.rows) {
    if (!rawRow || typeof rawRow !== 'object') {
      continue;
    }

    const row = rawRow as TickerChatBacktestBarRow;
    const returnPercent = readFiniteNumber(row.returnPercent);
    if (typeof row.label !== 'string' || returnPercent === null) {
      continue;
    }

    const label = row.label.trim().slice(0, TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS);
    if (!label) {
      continue;
    }

    rows.push({ label, returnPercent });
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    kind: 'backtest-bars',
    title,
    rows: rows.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS),
  };
}

function readPayoutBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'payout-bars') {
    return null;
  }

  const title = readBlockTitle(block.title);
  const currency = CURRENCY_OPTIONS.find((item) => item === block.currency);
  if (!title || !currency || !Array.isArray(block.rows)) {
    return null;
  }

  const rows: TickerChatPayoutBarRow[] = [];
  for (const rawRow of block.rows) {
    if (!rawRow || typeof rawRow !== 'object') {
      continue;
    }

    const row = rawRow as TickerChatPayoutBarRow;
    const amount = readFiniteNumber(row.amount);
    if (typeof row.label !== 'string' || amount === null) {
      continue;
    }

    const label = row.label.trim().slice(0, TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS);
    if (!label) {
      continue;
    }

    rows.push({ label, amount });
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    kind: 'payout-bars',
    title,
    currency,
    rows: rows.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS),
  };
}

function readWeightBarsBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'weight-bars') {
    return null;
  }

  const title = readBlockTitle(block.title);
  if (!title || !Array.isArray(block.rows)) {
    return null;
  }

  const rows: TickerChatWeightBarRow[] = [];
  for (const rawRow of block.rows) {
    if (!rawRow || typeof rawRow !== 'object') {
      continue;
    }

    const row = rawRow as TickerChatWeightBarRow;
    const weightPercent = readFiniteNumber(row.weightPercent);
    if (typeof row.label !== 'string' || weightPercent === null || weightPercent < 0) {
      continue;
    }

    const label = row.label.trim().slice(0, TICKER_CHAT_DISPLAY_BLOCK_MAX_TITLE_CHARS);
    if (!label) {
      continue;
    }

    rows.push({ label, weightPercent });
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    kind: 'weight-bars',
    title,
    rows: rows.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS),
  };
}

function readHeadlineListBlock(block: TickerChatDisplayBlock): TickerChatDisplayBlock | null {
  if (block.kind !== 'headline-list') {
    return null;
  }

  const title = readBlockTitle(block.title);
  if (!title || !Array.isArray(block.rows)) {
    return null;
  }

  const rows: TickerChatHeadlineRow[] = [];
  for (const rawRow of block.rows) {
    if (!rawRow || typeof rawRow !== 'object') {
      continue;
    }

    const row = rawRow as TickerChatHeadlineRow;
    const ticker = readTickerSymbol(typeof row.ticker === 'string' ? row.ticker : '');
    if (!ticker || typeof row.headline !== 'string') {
      continue;
    }

    const headline = row.headline.trim().slice(0, TICKER_CHAT_SCREEN_HEADLINE_MAX_CHARS);
    if (!headline) {
      continue;
    }

    rows.push({ ticker, headline });
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    kind: 'headline-list',
    title,
    rows: rows.slice(0, TICKER_CHAT_SCREEN_MAX_ROWS),
  };
}

function readDisplayBlocks(value: unknown): TickerChatDisplayBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: TickerChatDisplayBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const block =
      readCompareBarsBlock(item as TickerChatDisplayBlock) ??
      readAllocationBarsBlock(item as TickerChatDisplayBlock) ??
      readMoverBarsBlock(item as TickerChatDisplayBlock) ??
      readBacktestBarsBlock(item as TickerChatDisplayBlock) ??
      readPayoutBarsBlock(item as TickerChatDisplayBlock) ??
      readWeightBarsBlock(item as TickerChatDisplayBlock) ??
      readHeadlineListBlock(item as TickerChatDisplayBlock);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

function readBacktestScreenContext(
  screenContext: ChatBacktestScreenContext
): ChatBacktestScreenContext | undefined {
  const period = BACKTEST_PERIODS.find((item) => item.value === screenContext.period)?.value;
  const displayCurrency = CURRENCY_OPTIONS.find(
    (currency) => currency === screenContext.displayCurrency
  );
  if (
    !period ||
    !displayCurrency ||
    typeof screenContext.amount !== 'number' ||
    !Number.isFinite(screenContext.amount) ||
    screenContext.amount < BACKTEST_MIN_AMOUNT ||
    screenContext.amount > BACKTEST_MAX_AMOUNT ||
    !Array.isArray(screenContext.allocations)
  ) {
    return undefined;
  }

  const allocations: ChatBacktestAllocation[] = [];
  for (const item of screenContext.allocations) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const ticker = readTickerSymbol(item.ticker ?? '');
    const weightPercent = readFiniteNumber(item.weightPercent);
    if (!ticker || typeof item.name !== 'string' || weightPercent === null || weightPercent <= 0) {
      continue;
    }

    if (allocations.some((allocation) => allocation.ticker === ticker)) {
      continue;
    }

    allocations.push({
      ticker,
      name: readCompanyName(item.name, ticker),
      weightPercent,
    });
  }

  if (allocations.length === 0 || allocations.length > BACKTEST_MAX_TICKERS) {
    return undefined;
  }

  const totalWeight = allocations.reduce((sum, allocation) => sum + allocation.weightPercent, 0);
  if (Math.abs(totalWeight - BACKTEST_ALLOCATION_TOTAL_PERCENT) > BACKTEST_ALLOCATION_TOLERANCE) {
    return undefined;
  }

  return {
    kind: TICKER_CHAT_SCREEN_BACKTEST_KIND,
    period,
    amount: screenContext.amount,
    displayCurrency,
    allocations,
  };
}

function readScreenContext(value: unknown): ChatScreenContext | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const screenContext = value as ChatScreenContext;
  if (screenContext.kind === TICKER_CHAT_SCREEN_MOVERS_KIND) {
    return { kind: TICKER_CHAT_SCREEN_MOVERS_KIND };
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_BACKTEST_KIND) {
    return readBacktestScreenContext(screenContext);
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_DIVIDENDS_KIND) {
    const displayCurrency = CURRENCY_OPTIONS.find(
      (currency) => currency === screenContext.displayCurrency
    );
    return displayCurrency
      ? { kind: TICKER_CHAT_SCREEN_DIVIDENDS_KIND, displayCurrency }
      : undefined;
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_TICKER_KIND) {
    const period = STOCK_PERIODS.find((item) => item.value === screenContext.period)?.value;
    return period ? { kind: TICKER_CHAT_SCREEN_TICKER_KIND, period } : undefined;
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_NEWS_KIND) {
    return { kind: TICKER_CHAT_SCREEN_NEWS_KIND };
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_WATCHLIST_KIND) {
    return { kind: TICKER_CHAT_SCREEN_WATCHLIST_KIND };
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_PORTFOLIO_KIND) {
    const displayCurrency = CURRENCY_OPTIONS.find(
      (currency) => currency === screenContext.displayCurrency
    );
    return displayCurrency
      ? { kind: TICKER_CHAT_SCREEN_PORTFOLIO_KIND, displayCurrency }
      : undefined;
  }

  if (screenContext.kind === TICKER_CHAT_SCREEN_REBALANCING_KIND) {
    const displayCurrency = CURRENCY_OPTIONS.find(
      (currency) => currency === screenContext.displayCurrency
    );
    if (!displayCurrency) {
      return undefined;
    }

    return { kind: TICKER_CHAT_SCREEN_REBALANCING_KIND, displayCurrency };
  }

  if (
    screenContext.kind !== TICKER_CHAT_SCREEN_COMPARE_KIND ||
    !Array.isArray(screenContext.tickers)
  ) {
    return undefined;
  }

  const tickers: ChatCompareScreenTicker[] = [];
  for (const item of screenContext.tickers) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const ticker = readTickerSymbol(item.ticker ?? '');
    if (!ticker || typeof item.name !== 'string') {
      continue;
    }

    if (tickers.some((storedTicker) => storedTicker.ticker === ticker)) {
      continue;
    }

    tickers.push({
      ticker,
      name: readCompanyName(item.name, ticker),
    });
  }

  if (tickers.length < STOCK_COMPARE_MIN_TICKERS) {
    return undefined;
  }

  return {
    kind: TICKER_CHAT_SCREEN_COMPARE_KIND,
    tickers: tickers.slice(0, STOCK_COMPARE_MAX_TICKERS),
  };
}

function notifyChatScreenContextChanged(): void {
  window.dispatchEvent(new Event(TICKER_CHAT_SCREEN_CONTEXT_EVENT));
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

function readVisitedTicker(
  ticker: unknown,
  companyName: unknown
): { ticker: string; companyName: string } | undefined {
  if (typeof ticker !== 'string') {
    return undefined;
  }

  const tickerSymbol = readTickerSymbol(ticker);
  if (!tickerSymbol) {
    return undefined;
  }

  const storedName = typeof companyName === 'string' ? companyName : tickerSymbol;
  return { ticker: tickerSymbol, companyName: readCompanyName(storedName, tickerSymbol) };
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

    const screenContext = readScreenContext(parsedSession.screenContext);
    const appThread =
      parsedSession.appThread &&
      typeof parsedSession.appThread === 'object' &&
      !Array.isArray(parsedSession.appThread)
        ? parsedSession.appThread
        : undefined;
    const lastVisited = readVisitedTicker(
      parsedSession.lastVisitedTicker,
      parsedSession.lastVisitedCompanyName
    );
    const compareOffer = readVisitedTicker(
      parsedSession.compareOfferTicker,
      parsedSession.compareOfferCompanyName
    );
    const archivedThreads = readArchivedThreads(parsedSession.archivedThreads);

    return {
      threads,
      activeTicker:
        typeof parsedSession.activeTicker === 'string' ? parsedSession.activeTicker : undefined,
      activeCompanyName:
        typeof parsedSession.activeCompanyName === 'string'
          ? parsedSession.activeCompanyName
          : undefined,
      ...(screenContext ? { screenContext } : {}),
      ...(appThread ? { appThread } : {}),
      ...(archivedThreads.length > 0 ? { archivedThreads } : {}),
      ...(lastVisited
        ? {
            lastVisitedTicker: lastVisited.ticker,
            lastVisitedCompanyName: lastVisited.companyName,
          }
        : {}),
      ...(compareOffer
        ? {
            compareOfferTicker: compareOffer.ticker,
            compareOfferCompanyName: compareOffer.companyName,
          }
        : {}),
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
  if (
    Object.keys(store.threads).length === 0 &&
    !store.activeTicker &&
    !store.screenContext &&
    !store.appThread &&
    !store.archivedThreads?.length &&
    !store.lastVisitedTicker &&
    !store.compareOfferTicker
  ) {
    sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(TICKER_CHAT_SESSION_STORAGE_KEY, JSON.stringify(store));
}

function readArchivedThreads(value: unknown): StoredTickerChatThread[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const threads: StoredTickerChatThread[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as StoredTickerChatThread;
    const messages = readStoredMessages(candidate.messages);
    if (messages.length === 0) {
      continue;
    }

    threads.push({
      messages,
      draft: readStoredDraft(candidate.draft),
      updatedAtMs: typeof candidate.updatedAtMs === 'number' ? candidate.updatedAtMs : Date.now(),
    });

    if (threads.length >= TICKER_CHAT_ARCHIVED_THREAD_LIMIT) {
      break;
    }
  }

  return threads;
}

function toStoredThread(messages: TickerChatUiMessage[], draft: string): StoredTickerChatThread {
  return {
    messages: readStoredMessages(messages),
    draft: readStoredDraft(draft),
    updatedAtMs: Date.now(),
  };
}

export function loadArchivedAppChatCount(): number {
  return readStore().archivedThreads?.length ?? 0;
}

/** Keeps the current thread in this tab, then the caller starts an empty one. */
export function archiveCurrentAppChat(messages: TickerChatUiMessage[], draft: string): void {
  const storedMessages = readStoredMessages(messages);
  if (storedMessages.length === 0) {
    return;
  }

  updateStoredSession((store) => {
    const archivedThreads = store.archivedThreads ?? [];
    store.archivedThreads = [toStoredThread(storedMessages, draft), ...archivedThreads].slice(
      0,
      TICKER_CHAT_ARCHIVED_THREAD_LIMIT
    );
    delete store.appThread;
  });
}

/** Opens the newest archived thread and archives the current one when it has messages. */
export function restoreNewestArchivedAppChat(
  messages: TickerChatUiMessage[],
  draft: string
): TickerChatSessionSnapshot | null {
  const archivedThreads = readStore().archivedThreads ?? [];
  const newestThread = archivedThreads[0];
  if (!newestThread) {
    return null;
  }

  const currentMessages = readStoredMessages(messages);
  const remainingThreads = archivedThreads.slice(1);
  const nextArchivedThreads =
    currentMessages.length > 0
      ? [toStoredThread(currentMessages, draft), ...remainingThreads].slice(
          0,
          TICKER_CHAT_ARCHIVED_THREAD_LIMIT
        )
      : remainingThreads;

  updateStoredSession((store) => {
    if (nextArchivedThreads.length > 0) {
      store.archivedThreads = nextArchivedThreads;
    } else {
      delete store.archivedThreads;
    }

    store.appThread = {
      messages: newestThread.messages,
      draft: newestThread.draft,
      updatedAtMs: newestThread.updatedAtMs,
    };
  });

  return {
    messages: readStoredMessages(newestThread.messages),
    draft: readStoredDraft(newestThread.draft),
  };
}

export function loadAppChatSession(): TickerChatSessionSnapshot {
  const store = readStore();
  const thread =
    store.appThread ??
    (store.activeTicker ? store.threads[readTickerSymbol(store.activeTicker) ?? ''] : undefined);
  if (!thread) {
    return EMPTY_SNAPSHOT;
  }

  return {
    messages: readStoredMessages(thread.messages),
    draft: readStoredDraft(thread.draft),
  };
}

export function saveAppChatSession(messages: TickerChatUiMessage[], draft: string): void {
  const storedMessages = readStoredMessages(messages);
  const storedDraft = readStoredDraft(draft);

  updateStoredSession((store) => {
    if (storedMessages.length === 0 && storedDraft.trim().length === 0) {
      delete store.appThread;
      return;
    }

    store.appThread = {
      messages: storedMessages,
      draft: storedDraft,
      updatedAtMs: Date.now(),
    };
  });
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

export interface TickerChatCompareOffer {
  ticker: string;
  companyName: string;
}

/** Remember the ticker the user just opened. The previous one becomes the compare offer. */
export function rememberTickerVisit(ticker: string, companyName: string): void {
  const tickerSymbol = readTickerSymbol(ticker);
  if (!tickerSymbol) {
    return;
  }

  const storedCompanyName = readCompanyName(companyName, tickerSymbol);
  updateStoredSession((store) => {
    const previousTicker = readTickerSymbol(store.lastVisitedTicker ?? '');
    if (previousTicker && previousTicker !== tickerSymbol) {
      store.compareOfferTicker = previousTicker;
      store.compareOfferCompanyName = readCompanyName(
        store.lastVisitedCompanyName ?? '',
        previousTicker
      );
    }

    store.lastVisitedTicker = tickerSymbol;
    store.lastVisitedCompanyName = storedCompanyName;
  });
}

export function loadCompareOffer(currentTicker: string): TickerChatCompareOffer | null {
  const currentSymbol = readTickerSymbol(currentTicker);
  const store = readStore();
  const offerTicker = readTickerSymbol(store.compareOfferTicker ?? '');
  if (!currentSymbol || !offerTicker || offerTicker === currentSymbol) {
    return null;
  }

  return {
    ticker: offerTicker,
    companyName: readCompanyName(store.compareOfferCompanyName ?? '', offerTicker),
  };
}

export function loadChatScreenContext(): ChatScreenContext | null {
  return readStore().screenContext ?? null;
}

export function saveChatScreenContext(screenContext: ChatScreenContext | null): void {
  updateStoredSession((store) => {
    if (screenContext) {
      const storedScreenContext = readScreenContext(screenContext);
      if (!storedScreenContext) {
        delete store.screenContext;
        return;
      }

      store.screenContext = storedScreenContext;
      return;
    }

    delete store.screenContext;
  });
  notifyChatScreenContextChanged();
}

export function saveCompareChatScreen(tickers: ChatCompareScreenTicker[]): void {
  if (tickers.length < STOCK_COMPARE_MIN_TICKERS) {
    saveChatScreenContext(null);
    return;
  }

  if (!loadActiveTickerChat()) {
    const firstTicker = tickers[0];
    if (firstTicker) {
      saveActiveTickerChat(firstTicker.ticker, firstTicker.name);
    }
  }

  saveChatScreenContext({
    kind: TICKER_CHAT_SCREEN_COMPARE_KIND,
    tickers,
  });
}

export function saveRebalancingChatScreen(displayCurrency: string): void {
  const currency = CURRENCY_OPTIONS.find((option) => option === displayCurrency);
  if (!currency) {
    return;
  }

  saveChatScreenContext({
    kind: TICKER_CHAT_SCREEN_REBALANCING_KIND,
    displayCurrency: currency,
  });
}

export function saveMoversChatScreen(): void {
  saveChatScreenContext({ kind: TICKER_CHAT_SCREEN_MOVERS_KIND });
}

export function saveBacktestChatScreen(screenContext: ChatBacktestScreenContext): void {
  const storedScreenContext = readBacktestScreenContext(screenContext);
  saveChatScreenContext(storedScreenContext ?? null);
}

export function saveDividendsChatScreen(displayCurrency: Currency): void {
  const currency = CURRENCY_OPTIONS.find((item) => item === displayCurrency);
  saveChatScreenContext(
    currency ? { kind: TICKER_CHAT_SCREEN_DIVIDENDS_KIND, displayCurrency: currency } : null
  );
}

export function saveTickerChatScreen(period: StockChartPeriod): void {
  const storedPeriod = STOCK_PERIODS.find((item) => item.value === period)?.value;
  saveChatScreenContext(
    storedPeriod ? { kind: TICKER_CHAT_SCREEN_TICKER_KIND, period: storedPeriod } : null
  );
}

export function savePortfolioChatScreen(displayCurrency: Currency): void {
  const currency = CURRENCY_OPTIONS.find((item) => item === displayCurrency);
  saveChatScreenContext(
    currency ? { kind: TICKER_CHAT_SCREEN_PORTFOLIO_KIND, displayCurrency: currency } : null
  );
}

export function saveNewsChatScreen(): void {
  saveChatScreenContext({ kind: TICKER_CHAT_SCREEN_NEWS_KIND });
}

export function saveWatchlistChatScreen(): void {
  saveChatScreenContext({ kind: TICKER_CHAT_SCREEN_WATCHLIST_KIND });
}

export function clearTickerChatSession(): void {
  try {
    sessionStorage.removeItem(TICKER_CHAT_SESSION_STORAGE_KEY);
  } catch {
    // Ignore private-mode storage errors.
  }

  notifyChatScreenContextChanged();
}
