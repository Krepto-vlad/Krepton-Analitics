import { lazy, Suspense, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { ROUTES, TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX } from '../../../constants';
import { loadActiveTickerChat } from '../../../utils/tickerChatSession';

const TickerChatDrawer = lazy(() =>
  import('../../../pages/TickerDetailPage/components/TickerChatDrawer').then((module) => ({
    default: module.TickerChatDrawer,
  }))
);

function ignoreDrawerResizing(): void {
  // The ticker page pauses its own layout while the drawer is dragged.
  // On every other page the drawer only overlays the screen.
}

interface TickerChatReturnPanelProps {
  pathname: string;
}

function TickerChatReturnPanel({ pathname }: TickerChatReturnPanelProps) {
  const isTickerPage = matchPath({ path: ROUTES.TICKER, end: true }, pathname) != null;
  const [activeTickerChat] = useState(loadActiveTickerChat);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [drawerWidthPx, setDrawerWidthPx] = useState(TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX);

  if (isTickerPage || !activeTickerChat) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <TickerChatDrawer
        ticker={activeTickerChat.ticker}
        companyName={activeTickerChat.companyName}
        isOpen={isChatOpen}
        widthPx={drawerWidthPx}
        onOpenChange={setIsChatOpen}
        onWidthChange={setDrawerWidthPx}
        onResizingChange={ignoreDrawerResizing}
        openButtonLabel={`Back to ${activeTickerChat.ticker} chat`}
      />
    </Suspense>
  );
}

/**
 * Same ticker-chat button as the ticker page, on every other app page.
 * A route change remounts the panel, so the thread reloads and the drawer closes.
 */
export function TickerChatReturnHost() {
  const { pathname } = useLocation();
  return <TickerChatReturnPanel key={pathname} pathname={pathname} />;
}
