import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, ChevronUp, CircleHelp, Loader2, SendHorizontal } from 'lucide-react';
import {
  TICKER_CHAT_COMPOSER_COLLAPSED_HINT,
  TICKER_CHAT_HIDE_COMPOSER_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP,
  TICKER_CHAT_MAX_MESSAGE_CHARS,
  TICKER_CHAT_PAGE_MESSAGE_LABEL,
  TICKER_CHAT_PAGE_PLACEHOLDER,
  TICKER_CHAT_PERSONAL_DATA_DISABLED_HINT,
  TICKER_CHAT_SHOW_COMPOSER_LABEL,
} from '../../../constants';
import { AiGeneratedNotice } from '../../../components/ui';
import { writeIncludeHoldingContext } from './tickerChatDrawer.helpers';
import styles from './TickerChatDrawer.module.scss';

interface TickerChatComposerProps {
  isComposerCollapsed: boolean;
  onComposerCollapsedChange: (updater: (isCollapsed: boolean) => boolean) => void;
  titleId: string;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sharePersonalData: boolean;
  onIncludeHoldingContextChange: (value: boolean) => void;
  isSending: boolean;
  isPersonalDataDisabled: boolean;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  ticker: string | undefined;
  onComposerKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  canSend: boolean;
  holdingHelpTooltipId: string;
}

export function TickerChatComposer({
  isComposerCollapsed,
  onComposerCollapsedChange,
  titleId,
  error,
  onSubmit,
  sharePersonalData,
  onIncludeHoldingContextChange,
  isSending,
  isPersonalDataDisabled,
  draftMessage,
  onDraftMessageChange,
  ticker,
  onComposerKeyDown,
  canSend,
  holdingHelpTooltipId,
}: TickerChatComposerProps) {
  return (
    <>
      <div
        className={`${styles.composerShell} ${
          isComposerCollapsed ? styles.composerShellCollapsed : ''
        }`}
      >
        <button
          type="button"
          className={`${styles.composerToggle} ${
            isComposerCollapsed ? styles.composerToggleCollapsed : ''
          }`}
          aria-expanded={!isComposerCollapsed}
          aria-controls={`${titleId}-composer`}
          aria-label={
            isComposerCollapsed ? TICKER_CHAT_SHOW_COMPOSER_LABEL : TICKER_CHAT_HIDE_COMPOSER_LABEL
          }
          onClick={() => onComposerCollapsedChange((isCollapsed) => !isCollapsed)}
        >
          {isComposerCollapsed ? (
            <>
              <ChevronUp size={18} />
              <span>{TICKER_CHAT_COMPOSER_COLLAPSED_HINT}</span>
            </>
          ) : (
            <ChevronDown size={18} />
          )}
        </button>
        <div
          id={`${titleId}-composer`}
          className={`${styles.composerCollapse} ${
            isComposerCollapsed ? styles.composerCollapseClosed : ''
          }`}
        >
          <div className={styles.composerCollapseInner} inert={isComposerCollapsed}>
            {error && <p className={styles.errorText}>{error}</p>}

            <form className={styles.composer} onSubmit={(event) => onSubmit(event)}>
              <div className={styles.contextToggleRow}>
                <label className={styles.contextToggle}>
                  <input
                    type="checkbox"
                    checked={sharePersonalData}
                    onChange={(event) => {
                      const nextValue = event.target.checked;
                      onIncludeHoldingContextChange(nextValue);
                      writeIncludeHoldingContext(nextValue);
                    }}
                    disabled={isSending || isPersonalDataDisabled}
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
                    {isPersonalDataDisabled
                      ? TICKER_CHAT_PERSONAL_DATA_DISABLED_HINT
                      : TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP}
                  </span>
                </span>
              </div>
              <textarea
                className={styles.input}
                value={draftMessage}
                onChange={(event) => onDraftMessageChange(event.target.value)}
                placeholder={
                  ticker ? `Ask something about ${ticker}…` : TICKER_CHAT_PAGE_PLACEHOLDER
                }
                maxLength={TICKER_CHAT_MAX_MESSAGE_CHARS}
                rows={3}
                disabled={isSending}
                aria-label={ticker ? `Message about ${ticker}` : TICKER_CHAT_PAGE_MESSAGE_LABEL}
                onKeyDown={onComposerKeyDown}
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
        </div>
      </div>
    </>
  );
}
