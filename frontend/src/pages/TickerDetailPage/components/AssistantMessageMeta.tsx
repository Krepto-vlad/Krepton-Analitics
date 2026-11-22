import type { ReactElement } from 'react';
import {
  TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL,
  TICKER_CHAT_QUOTE_CHECKED_LABEL,
  TICKER_CHAT_WEB_SEARCH_LABEL,
} from '../../../constants';
import type { TickerChatUiMessage } from '../../../types/ai.types';
import styles from './TickerChatDrawer.module.scss';
import { formatFactCheckQuote } from './tickerChatDrawer.helpers';

export function AssistantMessageMeta({
  message,
}: {
  message: TickerChatUiMessage;
}): ReactElement | null {
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
