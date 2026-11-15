import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { CircleHelp, Loader2, MessageSquare, SendHorizontal, X } from 'lucide-react';
import {
  loadAppChatSession,
  loadChatScreenContext,
  saveAppChatSession,
  toVisibleTickerChatMessage,
  type ChatScreenContext,
} from '../../../utils/tickerChatSession';
import { fetchTickerChatQuota, sendTickerChatMessage } from '../../../api/portfolioApi';
import { ChatMarkdown } from '../../../components/ChatMarkdown/ChatMarkdown';
import { ChatCompareBars } from './ChatCompareBars';
import {
  APP_SHELL_HEADER_HEIGHT_PX,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
  TICKER_CHAT_DRAWER_MIN_WIDTH_PX,
  TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY,
  TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP,
  TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS,
  TICKER_CHAT_MAX_HISTORY_MESSAGES,
  TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS,
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_PAGE_MESSAGE_LABEL,
  TICKER_CHAT_PAGE_PLACEHOLDER,
  TICKER_CHAT_PAGE_SUBJECT,
  TICKER_CHAT_PAGE_SUBTITLE,
  TICKER_CHAT_QUOTE_CHECKED_LABEL,
  BACKTEST_PERIODS,
  STOCK_PERIODS,
  TICKER_CHAT_SCREEN_BACKTEST_BENCHMARK_MESSAGE,
  TICKER_CHAT_SCREEN_BACKTEST_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_CONTEXT_EVENT,
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
  TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC,
  TICKER_CHAT_WEB_SEARCH_LABEL,
  BEGINNER_TUTORIAL_ANCHORS,
} from '../../../constants';
import type {
  AiQuotaStatus,
  GenerateTickerChatPayload,
  TickerChatFactCheck,
  TickerChatHistoryMessage,
  TickerChatUiMessage,
} from '../../../types/ai.types';
import { getRejectedMessage } from '../../../utils/apiError';
import { toCssCustomProperties } from '../../../utils/cssCustomProperties';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { AiGeneratedNotice, Skeleton } from '../../../components/ui';
import styles from './TickerChatDrawer.module.scss';

function formatAllocationWeight(weightPercent: number): string {
  const roundedWeight = Math.round(weightPercent * 10) / 10;
  return Number.isInteger(roundedWeight) ? `${roundedWeight}%` : `${roundedWeight.toFixed(1)}%`;
}

function screenContextView(screenContext: ChatScreenContext): {
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

interface TickerChatDrawerProps {
  ticker?: string;
  companyName?: string;
  isOpen: boolean;
  widthPx: number;
  onOpenChange: (isOpen: boolean) => void;
  onWidthChange: (widthPx: number) => void;
  onResizingChange: (isResizing: boolean) => void;
  openButtonLabel?: string;
}

const HISTORY_TRUNCATION_SUFFIX = '…';
const TICKER_PLACEHOLDER = '{ticker}';

function clampDrawerWidth(widthPx: number): number {
  return Math.min(
    TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
    Math.max(TICKER_CHAT_DRAWER_MIN_WIDTH_PX, widthPx)
  );
}

function createMessageId(): string {
  return crypto.randomUUID();
}

function formatQuotaLabel(quota: AiQuotaStatus | null): string {
  if (!quota) {
    return 'Quota unavailable';
  }

  return `${quota.remaining}/${quota.limit} left today`;
}

function readIncludeHoldingContext(): boolean {
  try {
    return sessionStorage.getItem(TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeIncludeHoldingContext(value: boolean): void {
  try {
    sessionStorage.setItem(TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Private-mode storage can throw; the in-memory checkbox still works.
  }
}

function formatChatMoney(currency: string, amount: number): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatChatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatFactCheckQuote(factCheck: TickerChatFactCheck): string | null {
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

function AssistantMessageMeta({ message }: { message: TickerChatUiMessage }): ReactElement | null {
  if (message.role !== 'assistant') {
    return null;
  }

  const quoteLabel = message.factCheck ? formatFactCheckQuote(message.factCheck) : null;
  if (!quoteLabel) {
    return null;
  }

  return (
    <p className={styles.factCheckBar}>
      <span className={styles.factCheckLabel}>{TICKER_CHAT_QUOTE_CHECKED_LABEL}</span>
      <span>{quoteLabel}</span>
      {message.groundingEnabled ? (
        <span className={styles.webSearchBadge}>{TICKER_CHAT_WEB_SEARCH_LABEL}</span>
      ) : null}
      {message.factCheck?.corrected ? (
        <span className={styles.factCheckCorrected}>{TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL}</span>
      ) : null}
    </p>
  );
}

function truncateChatText(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const sliceLength = Math.max(0, maxChars - HISTORY_TRUNCATION_SUFFIX.length);
  return `${content.slice(0, sliceLength).trimEnd()}${HISTORY_TRUNCATION_SUFFIX}`;
}

/** Build API history: newest turns first within char budget; UI keeps full text. */
function buildRequestHistory(messages: TickerChatUiMessage[]): TickerChatHistoryMessage[] {
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

function buildScreenContextPayload(
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

function buildSuggestionPrompts(ticker: string): string[] {
  return TICKER_CHAT_SUGGESTION_PROMPTS.map((prompt) =>
    prompt.replaceAll(TICKER_PLACEHOLDER, ticker)
  );
}

function readElementTranslateX(element: HTMLElement): number {
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

/**
 * Fixed AI chat panel for a ticker page.
 * Each ticker keeps its own thread in this browser tab (sessionStorage).
 * Closing the panel hides it. The thread is not written to the server.
 */
export function TickerChatDrawer({
  ticker,
  companyName,
  isOpen,
  widthPx,
  onOpenChange,
  onWidthChange,
  onResizingChange,
  openButtonLabel,
}: TickerChatDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsViewportRef = useRef<HTMLDivElement>(null);
  const suggestionsTrackRef = useRef<HTMLDivElement>(null);
  const pendingPauseScrollLeftRef = useRef<number | null>(null);
  const pendingResumeDelaySecRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [areSuggestionsPaused, setAreSuggestionsPaused] = useState(false);
  const resizeSessionRef = useRef<{ startX: number; startWidthPx: number } | null>(null);

  const [restoredSession] = useState(loadAppChatSession);
  const [messages, setMessages] = useState(restoredSession.messages);
  const [draftMessage, setDraftMessage] = useState(restoredSession.draft);
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [includeHoldingContext, setIncludeHoldingContext] = useState(readIncludeHoldingContext);
  const [screenContext, setScreenContext] = useState<ChatScreenContext | null>(
    loadChatScreenContext
  );
  const holdingHelpTooltipId = `${titleId}-holding-help`;
  const isQuotaPending = quota === null && error === null;

  const suggestionPrompts = ticker ? buildSuggestionPrompts(ticker) : [];
  const chatSubject = ticker ?? TICKER_CHAT_PAGE_SUBJECT;
  /** Duplicate for a seamless CSS marquee loop. */
  const marqueePrompts = [...suggestionPrompts, ...suggestionPrompts];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    void fetchTickerChatQuota()
      .then((nextQuota) => {
        if (!cancelled) {
          setQuota(nextQuota);
        }
      })
      .catch((quotaError) => {
        if (!cancelled) {
          setError(getRejectedMessage(quotaError, ERROR_MESSAGES.AI_TICKER_CHAT_QUOTA_FAILED));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    saveAppChatSession(messages, draftMessage);
  }, [messages, draftMessage]);

  useEffect(() => {
    function refreshScreenContext(): void {
      setScreenContext(loadChatScreenContext());
    }

    window.addEventListener(TICKER_CHAT_SCREEN_CONTEXT_EVENT, refreshScreenContext);
    return () => {
      window.removeEventListener(TICKER_CHAT_SCREEN_CONTEXT_EVENT, refreshScreenContext);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useLayoutEffect(() => {
    const viewport = suggestionsViewportRef.current;
    const track = suggestionsTrackRef.current;
    if (!viewport || !track) {
      return;
    }

    if (areSuggestionsPaused) {
      const pendingScrollLeft = pendingPauseScrollLeftRef.current;
      if (pendingScrollLeft != null) {
        viewport.scrollLeft = pendingScrollLeft;
        pendingPauseScrollLeftRef.current = null;
      }
      return;
    }

    const resumeDelaySec = pendingResumeDelaySecRef.current;
    if (resumeDelaySec == null) {
      return;
    }

    track.style.animation = 'none';
    // Force restart so animation-delay applies from the paused offset.
    void track.offsetWidth;
    track.style.removeProperty('animation');
    track.style.setProperty('--marquee-delay', `${resumeDelaySec}s`);
    pendingResumeDelaySecRef.current = null;
  }, [areSuggestionsPaused]);

  function handleSuggestionsPointerEnter(): void {
    if (areSuggestionsPaused) {
      return;
    }

    const track = suggestionsTrackRef.current;
    if (track) {
      const loopWidthPx = track.scrollWidth / 2;
      const translateOffsetPx = Math.abs(readElementTranslateX(track));
      pendingPauseScrollLeftRef.current =
        loopWidthPx > 0 ? translateOffsetPx % loopWidthPx : translateOffsetPx;
    }

    setAreSuggestionsPaused(true);
  }

  function handleSuggestionsPointerLeave(): void {
    const viewport = suggestionsViewportRef.current;
    const track = suggestionsTrackRef.current;

    if (viewport && track) {
      const loopWidthPx = track.scrollWidth / 2;
      const offsetPx = loopWidthPx > 0 ? viewport.scrollLeft % loopWidthPx : 0;
      const progress = loopWidthPx > 0 ? offsetPx / loopWidthPx : 0;
      pendingResumeDelaySecRef.current = -progress * TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC;
      viewport.scrollLeft = 0;
    }

    setAreSuggestionsPaused(false);
  }

  function handleCloseChat(): void {
    setAreSuggestionsPaused(false);
    pendingPauseScrollLeftRef.current = null;
    pendingResumeDelaySecRef.current = null;
    setError(null);
    onOpenChange(false);
  }

  function handleStartNewChat(): void {
    setMessages([]);
    setDraftMessage('');
    setError(null);
  }

  useFocusTrap({
    containerRef: drawerRef,
    isActive: isOpen,
    onEscape: handleCloseChat,
    lockBodyScroll: false,
  });

  function handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isOpen) {
      return;
    }

    event.preventDefault();
    resizeSessionRef.current = {
      startX: event.clientX,
      startWidthPx: widthPx,
    };
    setIsResizing(true);
    onResizingChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleResizePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const session = resizeSessionRef.current;
    if (!session) {
      return;
    }

    const deltaX = session.startX - event.clientX;
    onWidthChange(clampDrawerWidth(session.startWidthPx + deltaX));
  }

  function handleResizePointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!resizeSessionRef.current) {
      return;
    }

    resizeSessionRef.current = null;
    setIsResizing(false);
    onResizingChange(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function sendChatMessage(rawMessage: string): Promise<void> {
    const trimmedMessage = toVisibleTickerChatMessage(rawMessage).slice(
      0,
      TICKER_CHAT_MAX_MESSAGE_CHARS
    );
    if (!trimmedMessage) {
      setError(ERROR_MESSAGES.AI_TICKER_CHAT_EMPTY_MESSAGE);
      return;
    }

    if (isSending) {
      return;
    }

    if (quota && quota.remaining <= 0) {
      setError(`Daily AI chat limit reached (${quota.limit} per day).`);
      return;
    }

    const history = buildRequestHistory(messages);

    const userMessage: TickerChatUiMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setDraftMessage('');
    setError(null);
    setIsSending(true);

    const payload: GenerateTickerChatPayload = {
      message: trimmedMessage,
      history,
      includeHoldingContext: Boolean(ticker) && includeHoldingContext,
    };
    if (ticker) {
      payload.ticker = ticker;
    }
    if (screenContext) {
      payload.screenContext = buildScreenContextPayload(screenContext);
    }

    try {
      const response = await sendTickerChatMessage(payload);

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.reply,
          groundingEnabled: response.groundingEnabled,
          factCheck: response.factCheck,
          displayBlocks: response.displayBlocks,
        },
      ]);
      setQuota(response.quota);
    } catch (sendError) {
      setError(getRejectedMessage(sendError, ERROR_MESSAGES.AI_TICKER_CHAT_FAILED));
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setDraftMessage(trimmedMessage);
    } finally {
      setIsSending(false);
    }
  }

  function handleSuggestionClick(prompt: string): void {
    void sendChatMessage(prompt);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await sendChatMessage(draftMessage);
  }

  const drawerStyle = toCssCustomProperties({
    '--ticker-chat-drawer-width': `${widthPx}px`,
    '--app-shell-header-height': `${APP_SHELL_HEADER_HEIGHT_PX}px`,
    '--marquee-duration': `${TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC}s`,
  });

  const canSend =
    !isSending && draftMessage.trim().length > 0 && (quota == null || quota.remaining > 0);

  return (
    <>
      <button
        type="button"
        className={`${styles.fab} ${isOpen ? styles.fabHidden : ''}`}
        onClick={() => {
          setAreSuggestionsPaused(false);
          onWidthChange(clampDrawerWidth(widthPx));
          onOpenChange(true);
        }}
        tabIndex={isOpen ? -1 : undefined}
        aria-hidden={isOpen}
        aria-label={openButtonLabel ?? 'Open AI chat'}
        title={openButtonLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={titleId}
      >
        <MessageSquare size={20} />
      </button>

      <aside
        ref={drawerRef}
        id={titleId}
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''} ${isResizing ? styles.drawerResizing : ''}`}
        style={drawerStyle}
        data-tutorial-anchor={isOpen ? BEGINNER_TUTORIAL_ANCHORS.tickerChat : undefined}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-labelledby={`${titleId}-label`}
        tabIndex={-1}
        {...(!isOpen ? { inert: true } : {})}
      >
        <div
          className={styles.resizeHandle}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI chat panel"
          aria-valuemin={TICKER_CHAT_DRAWER_MIN_WIDTH_PX}
          aria-valuemax={TICKER_CHAT_DRAWER_MAX_WIDTH_PX}
          aria-valuenow={widthPx}
        />

        <div className={styles.drawerInner}>
          <header className={styles.header}>
            <div className={styles.headerText}>
              <h2 id={`${titleId}-label`} className={styles.title}>
                AI chat
              </h2>
              <p className={styles.subtitle}>
                {ticker ? `${ticker} · ${companyName || ticker}` : TICKER_CHAT_PAGE_SUBTITLE}
              </p>
            </div>
            <div className={styles.headerMeta}>
              {isQuotaPending ? (
                <span
                  className={styles.quotaBadge}
                  aria-busy="true"
                  aria-label={LOADING_MESSAGES.AI_QUOTA}
                >
                  <Skeleton className={styles.quotaSkeleton} />
                </span>
              ) : (
                <span className={styles.quotaBadge}>{formatQuotaLabel(quota)}</span>
              )}
              {messages.length > 0 && (
                <button
                  type="button"
                  className={styles.newChatButton}
                  onClick={handleStartNewChat}
                  disabled={isSending}
                >
                  New chat
                </button>
              )}
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseChat}
                aria-label="Close AI chat"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {suggestionPrompts.length > 0 && (
            <div
              ref={suggestionsViewportRef}
              className={`${styles.suggestions} ${isOpen && areSuggestionsPaused ? styles.suggestionsPaused : ''}`}
              aria-label="Suggested questions"
              onPointerEnter={handleSuggestionsPointerEnter}
              onPointerLeave={handleSuggestionsPointerLeave}
              onWheel={(event) => {
                if (!areSuggestionsPaused) {
                  return;
                }

                const viewport = event.currentTarget;
                if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
                  return;
                }

                if (viewport.scrollWidth <= viewport.clientWidth) {
                  return;
                }

                event.preventDefault();
                viewport.scrollLeft += event.deltaY;
              }}
            >
              <div ref={suggestionsTrackRef} className={styles.suggestionsTrack}>
                {marqueePrompts.map((prompt, index) => {
                  const isDuplicateChip = index >= suggestionPrompts.length;

                  return (
                    <button
                      key={`${prompt}-${index}`}
                      type="button"
                      className={styles.suggestionChip}
                      onClick={() => handleSuggestionClick(prompt)}
                      disabled={isSending}
                      title={prompt}
                      tabIndex={isDuplicateChip ? -1 : undefined}
                      aria-hidden={isDuplicateChip}
                    >
                      {prompt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {screenContext && (
            <div className={styles.screenContext}>
              <p className={styles.screenContextLabel}>{screenContextView(screenContext).label}</p>
              <div className={styles.screenContextActions}>
                {screenContextView(screenContext).actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className={styles.screenContextButton}
                    onClick={() => handleSuggestionClick(action.message)}
                    disabled={isSending}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.messages}>
            {messages.length === 0 && !isSending ? (
              <div className={styles.emptyState}>
                <div className={styles.placeholderIcon} aria-hidden>
                  <MessageSquare size={22} />
                </div>
                <p className={styles.placeholderTitle}>Ask about {chatSubject}</p>
                <p className={styles.placeholderText}>
                  Pick a suggestion above or type your own question. This thread stays in the
                  browser tab while you look at other pages.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageBubble} ${
                    message.role === 'user' ? styles.messageUser : styles.messageAssistant
                  }`}
                >
                  <p className={styles.messageRole}>
                    {message.role === 'user' ? 'You' : 'Krepton AI'}
                  </p>
                  {message.role === 'assistant' ? (
                    <ChatMarkdown content={message.content} />
                  ) : (
                    <p className={styles.messageContent}>
                      {toVisibleTickerChatMessage(message.content)}
                    </p>
                  )}
                  {message.role === 'assistant' && message.displayBlocks && (
                    <ChatCompareBars blocks={message.displayBlocks} />
                  )}
                  <AssistantMessageMeta message={message} />
                </div>
              ))
            )}

            {isSending && (
              <div className={`${styles.messageBubble} ${styles.messageAssistant}`}>
                <p className={styles.messageRole}>Krepton AI</p>
                <div
                  className={styles.typingSkeleton}
                  role="status"
                  aria-busy="true"
                  aria-label={LOADING_MESSAGES.AI_CHAT_REPLY}
                >
                  <Skeleton className={styles.typingLinePrimary} />
                  <Skeleton className={styles.typingLineSecondary} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <form className={styles.composer} onSubmit={(event) => void handleSubmit(event)}>
            {ticker && (
              <div className={styles.contextToggleRow}>
                <label className={styles.contextToggle}>
                  <input
                    type="checkbox"
                    checked={includeHoldingContext}
                    onChange={(event) => {
                      const nextValue = event.target.checked;
                      setIncludeHoldingContext(nextValue);
                      writeIncludeHoldingContext(nextValue);
                    }}
                    disabled={isSending}
                  />
                  <span>{TICKER_CHAT_INCLUDE_HOLDING_LABEL}</span>
                </label>
                <span className={styles.contextToggleHelpWrap}>
                  <button
                    type="button"
                    className={styles.contextToggleHelpButton}
                    aria-label="Position sharing help"
                    aria-describedby={holdingHelpTooltipId}
                  >
                    <CircleHelp size={16} />
                  </button>
                  <span
                    id={holdingHelpTooltipId}
                    role="tooltip"
                    className={styles.contextToggleTooltip}
                  >
                    {TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP}
                  </span>
                </span>
              </div>
            )}
            <textarea
              className={styles.input}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={ticker ? `Ask something about ${ticker}…` : TICKER_CHAT_PAGE_PLACEHOLDER}
              maxLength={TICKER_CHAT_MAX_MESSAGE_CHARS}
              rows={3}
              disabled={isSending}
              aria-label={ticker ? `Message about ${ticker}` : TICKER_CHAT_PAGE_MESSAGE_LABEL}
            />
            <div className={styles.composerFooter}>
              <span className={styles.charCount}>
                {draftMessage.length}/{TICKER_CHAT_MAX_MESSAGE_CHARS}
              </span>
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!canSend}
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  <SendHorizontal size={16} />
                )}
                Send
              </button>
            </div>
            <AiGeneratedNotice />
          </form>
        </div>
      </aside>
    </>
  );
}
