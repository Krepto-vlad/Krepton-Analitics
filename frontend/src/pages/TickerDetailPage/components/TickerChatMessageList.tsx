import { lazy, Suspense, type RefObject } from 'react';
import { MessageSquare } from 'lucide-react';
import { LOADING_MESSAGES } from '../../../constants';
import type { TickerChatUiMessage } from '../../../types/ai.types';
import { toVisibleTickerChatMessage } from '../../../utils/tickerChatSession';
import { ChatMarkdown } from '../../../components/ChatMarkdown/ChatMarkdown';
import { Skeleton } from '../../../components/ui';
import { ChatCompareBars } from './ChatCompareBars';
import { AssistantMessageMeta } from './AssistantMessageMeta';

const ChatTickerChartCard = lazy(() =>
  import('./ChatTickerChartCard').then((module) => ({
    default: module.ChatTickerChartCard,
  }))
);
import styles from './TickerChatDrawer.module.scss';

interface TickerChatMessageListProps {
  messages: TickerChatUiMessage[];
  isSending: boolean;
  ticker: string | undefined;
  chatSubject: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function TickerChatMessageList({
  messages,
  isSending,
  ticker,
  chatSubject,
  messagesEndRef,
}: TickerChatMessageListProps) {
  return (
    <>
      <div className={styles.messages}>
        {messages.length === 0 && !isSending ? (
          <div className={styles.emptyState}>
            <div className={styles.placeholderIcon} aria-hidden>
              <MessageSquare size={22} />
            </div>
            <p className={styles.placeholderTitle}>Ask about {chatSubject}</p>
            <p className={styles.placeholderText}>
              Pick a suggestion above or type your own question. This thread stays in the browser
              tab while you look at other pages.
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
              <p className={styles.messageRole}>{message.role === 'user' ? 'You' : 'Krepton AI'}</p>
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
              {message.role === 'assistant' &&
                message.chartTicker &&
                message.chartTicker !== ticker && (
                  <Suspense fallback={null}>
                    <ChatTickerChartCard key={message.chartTicker} ticker={message.chartTicker} />
                  </Suspense>
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
    </>
  );
}
