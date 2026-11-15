import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import {
  APP_SHELL_ELEMENT_ATTRIBUTE,
  BEGINNER_TUTORIAL_CHAT_OPEN_VALUE,
  BEGINNER_TUTORIAL_CHAT_QUERY,
  CHAT_DRAWER_INSET_VARIABLE,
  CHAT_DRAWER_RESIZING_ATTRIBUTE,
  ROUTES,
  TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX,
  TICKER_CHAT_SCREEN_CONTEXT_EVENT,
  TICKER_CHAT_SCREEN_ROUTES,
} from '../../../constants';
import {
  loadActiveTickerChat,
  loadChatScreenContext,
  saveChatScreenContext,
} from '../../../utils/tickerChatSession';

const TickerChatDrawer = lazy(() =>
  import('../../../pages/TickerDetailPage/components/TickerChatDrawer').then((module) => ({
    default: module.TickerChatDrawer,
  }))
);

function findAppShell(): HTMLElement | null {
  const shell = document.querySelector(`[${APP_SHELL_ELEMENT_ATTRIBUTE}]`);
  return shell instanceof HTMLElement ? shell : null;
}

function syncChatDrawerInset(isOpen: boolean, widthPx: number, isResizing: boolean): void {
  const shell = findAppShell();
  if (!shell) {
    return;
  }

  shell.style.setProperty(CHAT_DRAWER_INSET_VARIABLE, isOpen ? `${widthPx}px` : '0px');
  if (isResizing) {
    shell.setAttribute(CHAT_DRAWER_RESIZING_ATTRIBUTE, 'true');
    return;
  }

  shell.removeAttribute(CHAT_DRAWER_RESIZING_ATTRIBUTE);
}

function keepsTickerChatScreen(pathname: string): boolean {
  return TICKER_CHAT_SCREEN_ROUTES.some(
    (route) => matchPath({ path: route, end: true }, pathname) != null
  );
}

function clearScreenContextOutsideDataPages(pathname: string): void {
  if (keepsTickerChatScreen(pathname) || !loadChatScreenContext()) {
    return;
  }

  saveChatScreenContext(null);
}

function readPageTicker(pathname: string): string | undefined {
  const match = matchPath({ path: ROUTES.TICKER, end: true }, pathname);
  const rawTicker = match?.params.ticker;
  if (!rawTicker) {
    return undefined;
  }

  return rawTicker.trim().toUpperCase();
}

function shouldOpenChatFromSearch(search: string): boolean {
  return (
    new URLSearchParams(search).get(BEGINNER_TUTORIAL_CHAT_QUERY) ===
    BEGINNER_TUTORIAL_CHAT_OPEN_VALUE
  );
}

/**
 * One chat for the whole app. It stays open while the user moves between pages.
 * A ticker is attached only on a ticker page. Every other page sends its own snapshot.
 */
export function TickerChatReturnHost() {
  const { pathname, search } = useLocation();
  clearScreenContextOutsideDataPages(pathname);

  const pageTicker = readPageTicker(pathname);
  const [activeTickerChat, setActiveTickerChat] = useState(loadActiveTickerChat);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dismissedChatQuery, setDismissedChatQuery] = useState<string | null>(null);
  const [drawerWidthPx, setDrawerWidthPx] = useState(TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX);
  const [isChatResizing, setIsChatResizing] = useState(false);
  const queryOpensChat = shouldOpenChatFromSearch(search) && dismissedChatQuery !== search;
  const chatIsOpen = isChatOpen || queryOpensChat;

  useEffect(() => {
    function refreshActiveTickerChat(): void {
      setActiveTickerChat(loadActiveTickerChat());
    }

    window.addEventListener(TICKER_CHAT_SCREEN_CONTEXT_EVENT, refreshActiveTickerChat);
    return () => {
      window.removeEventListener(TICKER_CHAT_SCREEN_CONTEXT_EVENT, refreshActiveTickerChat);
    };
  }, []);

  useLayoutEffect(() => {
    syncChatDrawerInset(chatIsOpen, drawerWidthPx, isChatResizing);
    return () => {
      syncChatDrawerInset(false, drawerWidthPx, false);
    };
  }, [chatIsOpen, drawerWidthPx, isChatResizing]);

  const companyName =
    pageTicker && activeTickerChat?.ticker === pageTicker
      ? activeTickerChat.companyName
      : pageTicker;

  return (
    <Suspense fallback={null}>
      <TickerChatDrawer
        ticker={pageTicker}
        companyName={companyName}
        isOpen={chatIsOpen}
        widthPx={drawerWidthPx}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen && shouldOpenChatFromSearch(search)) {
            setDismissedChatQuery(search);
          }
          setIsChatOpen(nextIsOpen);
        }}
        onWidthChange={setDrawerWidthPx}
        onResizingChange={setIsChatResizing}
      />
    </Suspense>
  );
}
