import type { RefObject } from 'react';
import { X } from 'lucide-react';
import { TICKER_CHAT_DISMISS_SCREEN_SUGGESTIONS_LABEL } from '../../../constants';
import type { ChatScreenContext } from '../../../utils/tickerChatSession';
import { screenContextView } from './tickerChatDrawer.helpers';
import styles from './TickerChatDrawer.module.scss';

interface TickerChatSuggestionsProps {
  suggestionPrompts: string[];
  marqueePrompts: string[];
  isOpen: boolean;
  areSuggestionsPaused: boolean;
  isSending: boolean;
  suggestionsViewportRef: RefObject<HTMLDivElement | null>;
  suggestionsTrackRef: RefObject<HTMLDivElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onSuggestionClick: (prompt: string) => void;
  screenContext: ChatScreenContext | null;
  areScreenSuggestionsDismissed: boolean;
  onDismissScreenSuggestions: () => void;
}

export function TickerChatSuggestions({
  suggestionPrompts,
  marqueePrompts,
  isOpen,
  areSuggestionsPaused,
  isSending,
  suggestionsViewportRef,
  suggestionsTrackRef,
  onPointerEnter,
  onPointerLeave,
  onSuggestionClick,
  screenContext,
  areScreenSuggestionsDismissed,
  onDismissScreenSuggestions,
}: TickerChatSuggestionsProps) {
  return (
    <>
      {suggestionPrompts.length > 0 && (
        <div
          ref={suggestionsViewportRef}
          className={`${styles.suggestions} ${isOpen && areSuggestionsPaused ? styles.suggestionsPaused : ''}`}
          aria-label="Suggested questions"
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
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
                  onClick={() => onSuggestionClick(prompt)}
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

      {screenContext && !areScreenSuggestionsDismissed && (
        <div className={styles.screenContext}>
          <div className={styles.screenContextHeader}>
            <p className={styles.screenContextLabel}>{screenContextView(screenContext).label}</p>
            <button
              type="button"
              className={styles.screenContextDismiss}
              aria-label={TICKER_CHAT_DISMISS_SCREEN_SUGGESTIONS_LABEL}
              onClick={() => onDismissScreenSuggestions()}
            >
              <X size={14} />
            </button>
          </div>
          <div className={styles.screenContextActions}>
            {screenContextView(screenContext).actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={styles.screenContextButton}
                onClick={() => onSuggestionClick(action.message)}
                disabled={isSending}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
