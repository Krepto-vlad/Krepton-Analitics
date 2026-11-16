import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestStore } from '../../../../__tests__/renderWithProviders';
import {
  APP_SHELL_ELEMENT_ATTRIBUTE,
  BEGINNER_TUTORIAL_CHAT_OPEN_VALUE,
  BEGINNER_TUTORIAL_CHAT_QUERY,
  CHAT_DRAWER_INSET_VARIABLE,
  CHAT_DRAWER_RESIZING_ATTRIBUTE,
  ROUTES,
  TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX,
  buildTickerDetailPath,
} from '../../../../constants';
import { fetchTickerChatQuota } from '../../../../api/portfolioApi';
import {
  loadChatScreenContext,
  saveActiveTickerChat,
  saveAppChatSession,
  savePortfolioChatScreen,
} from '../../../../utils/tickerChatSession';
import { TickerChatReturnHost } from '../TickerChatReturnHost';

jest.mock('../../../../api/portfolioApi', () => ({
  fetchTickerChatQuota: jest.fn(),
  sendTickerChatMessage: jest.fn(),
}));

jest.mock('../../../../components/ChatMarkdown/ChatMarkdown', () => ({
  ChatMarkdown: ({ content }: { content: string }) => <div>{content}</div>,
}));

const APPLE_TICKER = 'AAPL';
const SAVED_REPLY = 'Services revenue grew.';

function renderReturnHost(routePath: string) {
  return render(
    <Provider store={createTestStore()}>
      <div {...{ [APP_SHELL_ELEMENT_ATTRIBUTE]: '' }}>
        <MemoryRouter initialEntries={[routePath]}>
          <Routes>
            <Route path="*" element={<TickerChatReturnHost />} />
          </Routes>
        </MemoryRouter>
      </div>
    </Provider>
  );
}

describe('TickerChatReturnHost', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Element.prototype.scrollIntoView = jest.fn();
    jest.mocked(fetchTickerChatQuota).mockResolvedValue({
      used: 1,
      limit: 10,
      remaining: 9,
      resetsAt: '2026-10-20T00:00:00.000Z',
    });
  });

  it('opens the same chat from any page', async () => {
    const user = userEvent.setup();
    saveAppChatSession([{ id: 'reply-1', role: 'assistant', content: SAVED_REPLY }], '');

    renderReturnHost(ROUTES.NEWS);
    await user.click(await screen.findByRole('button', { name: 'Open AI chat' }));

    expect(await screen.findByText(SAVED_REPLY)).toBeInTheDocument();
    expect(screen.getByText('This page')).toBeInTheDocument();
    expect(document.querySelector(`[${APP_SHELL_ELEMENT_ATTRIBUTE}]`)).toHaveStyle({
      [CHAT_DRAWER_INSET_VARIABLE]: `${TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX}px`,
    });
    expect(document.querySelector(`[${APP_SHELL_ELEMENT_ATTRIBUTE}]`)).not.toHaveAttribute(
      CHAT_DRAWER_RESIZING_ATTRIBUTE
    );
  });

  it('keeps the chat open on a ticker page and names that ticker', async () => {
    saveActiveTickerChat(APPLE_TICKER, 'Apple Inc.');
    renderReturnHost(
      `${buildTickerDetailPath(APPLE_TICKER)}?${BEGINNER_TUTORIAL_CHAT_QUERY}=${BEGINNER_TUTORIAL_CHAT_OPEN_VALUE}`
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(`${APPLE_TICKER} · Apple Inc.`)).toBeInTheDocument();
  });

  it('drops the previous page snapshot on profile and keeps it on a data page', () => {
    savePortfolioChatScreen('USD');
    renderReturnHost(ROUTES.PROFILE);
    expect(loadChatScreenContext()).toBeNull();

    sessionStorage.clear();
    savePortfolioChatScreen('USD');
    renderReturnHost(ROUTES.NEWS);
    expect(loadChatScreenContext()).toEqual({ kind: 'portfolio', displayCurrency: 'USD' });
  });
});
