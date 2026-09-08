import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Loader2, MessageSquare, SendHorizontal, X } from 'lucide-react';
import { fetchTickerChatQuota, sendTickerChatMessage } from '../../../api/portfolioApi';
import { ChatMarkdown } from '../../../components/ChatMarkdown/ChatMarkdown';
import {
  APP_SHELL_HEADER_HEIGHT_PX,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  TICKER_CHAT_DISCLAIMER,
  TICKER_CHAT_DRAWER_MAX_WIDTH_PX,
  TICKER_CHAT_DRAWER_MIN_WIDTH_PX,
  TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS,
  TICKER_CHAT_MAX_HISTORY_MESSAGES,
  TICKER_CHAT_MAX_HISTORY_TOTAL_CHARS,
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SUGGESTION_PROMPTS,
  TICKER_CHAT_SUGGESTIONS_MARQUEE_DURATION_SEC,
} from '../../../constants';
import type {
  AiQuotaStatus,
  TickerChatHistoryMessage,
  TickerChatUiMessage,
} from '../../../types/ai.types';
import { getRejectedMessage } from '../../../utils/apiError';
import { toCssCustomProperties } from '../../../utils/cssCustomProperties';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { AiGeneratedNotice, Skeleton } from '../../../components/ui';
import styles from './TickerChatDrawer.module.scss';

interface TickerChatDrawerProps {
  ticker: string;
  companyName: string;
  isOpen: boolean;
  widthPx: number;
  onOpenChange: (isOpen: boolean) => void;
  onWidthChange: (widthPx: number) => void;
  onResizingChange: (isResizing: boolean) => void;
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
    content: truncateChatText(message.content, TICKER_CHAT_MAX_HISTORY_MESSAGE_CHARS),
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
 * Conversation is ephemeral (in-memory only) and scoped to the current ticker.
 */
export function TickerChatDrawer({
  ticker,
  companyName,
  isOpen,
  widthPx,
  onOpenChange,
  onWidthChange,
  onResizingChange,
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

  const [messages, setMessages] = useState<TickerChatUiMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [quota, setQuota] = useState<AiQuotaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isQuotaPending = quota === null && error === null;

  const suggestionPrompts = buildSuggestionPrompts(ticker);
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
  }, [isOpen, ticker]);

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
    setMessages([]);
    setError(null);
    onOpenChange(false);
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
    const trimmedMessage = rawMessage.trim().slice(0, TICKER_CHAT_MAX_MESSAGE_CHARS);
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

    try {
      const response = await sendTickerChatMessage({
        ticker,
        message: trimmedMessage,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.reply,
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
        aria-label={`Open AI chat about ${ticker}`}
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
                {ticker} · {companyName}
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

          <div className={styles.messages}>
            {messages.length === 0 && !isSending ? (
              <div className={styles.emptyState}>
                <div className={styles.placeholderIcon} aria-hidden>
                  <MessageSquare size={22} />
                </div>
                <p className={styles.placeholderTitle}>Ask about {ticker}</p>
                <p className={styles.placeholderText}>
                  Pick a suggestion above or type your own question. History stays on this page
                  only.
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
                    <p className={styles.messageContent}>{message.content}</p>
                  )}
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
            <textarea
              className={styles.input}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder={`Ask something about ${ticker}…`}
              maxLength={TICKER_CHAT_MAX_MESSAGE_CHARS}
              rows={3}
              disabled={isSending}
              aria-label={`Message about ${ticker}`}
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
            <p className={styles.disclaimer}>{TICKER_CHAT_DISCLAIMER}</p>
          </form>
        </div>
      </aside>
    </>
  );
}
