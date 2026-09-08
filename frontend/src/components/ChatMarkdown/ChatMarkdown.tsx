import ReactMarkdown from 'react-markdown';
import styles from './ChatMarkdown.module.scss';

interface ChatMarkdownProps {
  content: string;
}

/**
 * Renders assistant chat content as Markdown (bold, lists, italics).
 * Raw HTML is not enabled — react-markdown escapes it by default.
 * Anchors are rendered as text only so the chat never becomes an outbound-link surface.
 */
export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className={styles.root}>
      <ReactMarkdown
        components={{
          a: ({ children }) => <span>{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
