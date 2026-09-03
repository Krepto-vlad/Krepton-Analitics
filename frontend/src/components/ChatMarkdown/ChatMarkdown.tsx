import ReactMarkdown from 'react-markdown';
import { SAFE_MARKDOWN_LINK_PROTOCOLS } from '../../constants';
import styles from './ChatMarkdown.module.scss';

interface ChatMarkdownProps {
  content: string;
}

const ABSOLUTE_URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function resolveSafeMarkdownHref(href: string | undefined): string | null {
  if (!href) {
    return null;
  }

  const trimmedHref = href.trim();
  if (trimmedHref.length === 0) {
    return null;
  }

  // Protocol-relative URLs can escape the app origin.
  if (trimmedHref.startsWith('//')) {
    return null;
  }

  if (ABSOLUTE_URL_SCHEME_PATTERN.test(trimmedHref)) {
    try {
      const parsedUrl = new URL(trimmedHref);
      const isSafeProtocol = (SAFE_MARKDOWN_LINK_PROTOCOLS as readonly string[]).includes(
        parsedUrl.protocol
      );
      return isSafeProtocol ? trimmedHref : null;
    } catch {
      return null;
    }
  }

  // Same-app relative paths only.
  if (trimmedHref.startsWith('/')) {
    return trimmedHref;
  }

  return null;
}

/**
 * Renders assistant chat content as Markdown (bold, lists, italics, links).
 * Raw HTML is not enabled — react-markdown escapes it by default.
 * Link href schemes are restricted to http(s)/mailto (plus same-app paths).
 */
export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className={styles.root}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const safeHref = resolveSafeMarkdownHref(href);
            if (!safeHref) {
              return <span>{children}</span>;
            }

            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
