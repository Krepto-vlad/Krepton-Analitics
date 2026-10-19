import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTES, buildTickerDetailPath } from '../../../../constants';
import { fetchTickerChatQuota } from '../../../../api/portfolioApi';
import { saveActiveTickerChat, saveTickerChatSession } from '../../../../utils/tickerChatSession';
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
    <MemoryRouter initialEntries={[routePath]}>
      <Routes>
        <Route path="*" element={<TickerChatReturnHost />} />
      </Routes>
    </MemoryRouter>
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

  it('shows nothing until a ticker chat exists in this tab', () => {
    renderReturnHost(ROUTES.NEWS);
    expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument();
  });

  it('reopens the last ticker thread from another page', async () => {
    const user = userEvent.setup();
    saveActiveTickerChat(APPLE_TICKER, 'Apple Inc.');
    saveTickerChatSession(
      APPLE_TICKER,
      [{ id: 'reply-1', role: 'assistant', content: SAVED_REPLY }],
      ''
    );

    renderReturnHost(ROUTES.NEWS);
    const backToChatButton = await screen.findByRole('button', {
      name: `Back to ${APPLE_TICKER} chat`,
    });
    await user.click(backToChatButton);

    expect(await screen.findByText(SAVED_REPLY)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('leaves the ticker page button to the ticker page itself', () => {
    saveActiveTickerChat(APPLE_TICKER, 'Apple Inc.');
    renderReturnHost(buildTickerDetailPath(APPLE_TICKER));
    expect(screen.queryByRole('button', { name: /chat/i })).not.toBeInTheDocument();
  });
});
