import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { MessageSquare, X } from 'lucide-react';
import {
  archiveCurrentAppChat,
  loadAppChatSession,
  loadArchivedAppChatCount,
  loadChatScreenContext,
  restoreNewestArchivedAppChat,
  saveAppChatSession,
  toVisibleTickerChatMessage,
  type ChatScreenContext,
} from '../../../utils/tickerChatSession';
import { fetchTickerChatQuota, sendTickerChatMessage } from '../../../api/portfolioApi';
import {
  APP_SHELL_HEADER_HEIGHT_PX,
  BEGINNER_TUTORIAL_ANCHORS,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
  TICKER_CHAT_DRAWER_MIN_WIDTH_PX,
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_PAGE_SUBJECT,
  TICKER_CHAT_PAGE_SUBTITLE,
  TICKER_CHAT_PREVIOUS_CHAT_LABEL,
  TICKER_CHAT_SCREEN_CONTEXT_EVENT,
  TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC,
} from '../../../constants';
import type {
  AiQuotaStatus,
  GenerateTickerChatPayload,
  TickerChatUiMessage,
} from '../../../types/ai.types';
import { getRejectedMessage } from '../../../utils/apiError';
import { toCssCustomProperties } from '../../../utils/cssCustomProperties';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { Skeleton } from '../../../components/ui';
import styles from './TickerChatDrawer.module.scss';
import { TickerChatComposer } from './TickerChatComposer';
import { TickerChatMessageList } from './TickerChatMessageList';
import { TickerChatSuggestions } from './TickerChatSuggestions';
import {
  buildRequestHistory,
  buildScreenContextPayload,
  buildSuggestionPrompts,
  clampDrawerWidth,
  createMessageId,
  formatQuotaLabel,
  isPersonalScreen,
  readElementTranslateX,
  readIncludeHoldingContext,
} from './tickerChatDrawer.helpers';

interface TickerChatDrawerProps {
  ticker?: string;
  companyName?: string;
  isOpen: boolean;
  widthPx: number;
  onOpenChange: (isOpen: boolean) => void;
  onWidthChange: (widthPx: number) => void;
  onResizingChange: (isResizing: boolean) => void;
  openButtonLabel?: string;
  /** Profile kill switch. The composer checkbox cannot override this. */
  isPersonalDataDisabled?: boolean;
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
  isPersonalDataDisabled = false,
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
  const [archivedChatCount, setArchivedChatCount] = useState(loadArchivedAppChatCount);
  const [areScreenSuggestionsDismissed, setAreScreenSuggestionsDismissed] = useState(false);
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);
  const sharePersonalData = !isPersonalDataDisabled && includeHoldingContext;
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
    archiveCurrentAppChat(messages, draftMessage);
    setMessages([]);
    setDraftMessage('');
    setError(null);
    setAreScreenSuggestionsDismissed(false);
    setIsComposerCollapsed(false);
    setArchivedChatCount(loadArchivedAppChatCount());
  }

  function handleRestorePreviousChat(): void {
    const restoredChat = restoreNewestArchivedAppChat(messages, draftMessage);
    if (!restoredChat) {
      setArchivedChatCount(0);
      return;
    }

    setMessages(restoredChat.messages);
    setDraftMessage(restoredChat.draft);
    setError(null);
    setAreScreenSuggestionsDismissed(false);
    setIsComposerCollapsed(false);
    setArchivedChatCount(loadArchivedAppChatCount());
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
      includeHoldingContext: Boolean(ticker) && sharePersonalData,
    };
    if (ticker) {
      payload.ticker = ticker;
    }
    if (screenContext && (sharePersonalData || !isPersonalScreen(screenContext))) {
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
          ...(response.chartTicker ? { chartTicker: response.chartTicker } : {}),
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

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (!canSend) {
      return;
    }

    void sendChatMessage(draftMessage);
  }

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
              {archivedChatCount > 0 && (
                <button
                  type="button"
                  className={styles.newChatButton}
                  onClick={handleRestorePreviousChat}
                  disabled={isSending}
                >
                  {TICKER_CHAT_PREVIOUS_CHAT_LABEL}
                </button>
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

          <TickerChatSuggestions
            suggestionPrompts={suggestionPrompts}
            marqueePrompts={marqueePrompts}
            isOpen={isOpen}
            areSuggestionsPaused={areSuggestionsPaused}
            isSending={isSending}
            suggestionsViewportRef={suggestionsViewportRef}
            suggestionsTrackRef={suggestionsTrackRef}
            onPointerEnter={handleSuggestionsPointerEnter}
            onPointerLeave={handleSuggestionsPointerLeave}
            onSuggestionClick={handleSuggestionClick}
            screenContext={screenContext}
            areScreenSuggestionsDismissed={areScreenSuggestionsDismissed}
            onDismissScreenSuggestions={() => setAreScreenSuggestionsDismissed(true)}
          />
          <TickerChatMessageList
            messages={messages}
            isSending={isSending}
            ticker={ticker}
            chatSubject={chatSubject}
            messagesEndRef={messagesEndRef}
          />
          <TickerChatComposer
            isComposerCollapsed={isComposerCollapsed}
            onComposerCollapsedChange={setIsComposerCollapsed}
            titleId={titleId}
            error={error}
            onSubmit={(event) => void handleSubmit(event)}
            sharePersonalData={sharePersonalData}
            onIncludeHoldingContextChange={setIncludeHoldingContext}
            isSending={isSending}
            isPersonalDataDisabled={isPersonalDataDisabled}
            draftMessage={draftMessage}
            onDraftMessageChange={setDraftMessage}
            ticker={ticker}
            onComposerKeyDown={handleComposerKeyDown}
            canSend={canSend}
            holdingHelpTooltipId={holdingHelpTooltipId}
          />
        </div>
      </aside>
    </>
  );
}
