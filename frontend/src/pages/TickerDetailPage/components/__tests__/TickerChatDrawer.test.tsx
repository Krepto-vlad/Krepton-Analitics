import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX,
  TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_LABEL,
  TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY,
  TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP,
  TICKER_CHAT_QUOTE_CHECKED_LABEL,
  TICKER_CHAT_SCREEN_BACKTEST_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_DIVIDENDS_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_NEWS_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_PORTFOLIO_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_TICKER_EXPLAIN_MESSAGE,
  TICKER_CHAT_SCREEN_WATCHLIST_EXPLAIN_MESSAGE,
  TICKER_CHAT_SUGGESTION_PROMPTS,
  TICKER_CHAT_WEB_SEARCH_LABEL,
} from '../../../../constants';
import { fetchTickerChatQuota, sendTickerChatMessage } from '../../../../api/portfolioApi';
import type { AiQuotaStatus, TickerChatResponse } from '../../../../types/ai.types';
import {
  saveBacktestChatScreen,
  saveCompareChatScreen,
  saveDividendsChatScreen,
  saveNewsChatScreen,
  savePortfolioChatScreen,
  saveTickerChatScreen,
  saveWatchlistChatScreen,
} from '../../../../utils/tickerChatSession';
import { TickerChatDrawer } from '../TickerChatDrawer';

jest.mock('../../../../api/portfolioApi', () => ({
  fetchTickerChatQuota: jest.fn(),
  sendTickerChatMessage: jest.fn(),
}));

jest.mock('../../../../components/ChatMarkdown/ChatMarkdown', () => ({
  ChatMarkdown: ({ content }: { content: string }) => <div>{content}</div>,
}));

const APPLE_TICKER = 'AAPL';
const APPLE_COMPANY_NAME = 'Apple Inc.';
const USER_QUESTION = 'What moved AAPL today?';
const ASSISTANT_REPLY = 'Earnings beat expectations.';

const availableQuota: AiQuotaStatus = {
  used: 1,
  limit: 10,
  remaining: 9,
  resetsAt: '2026-09-09T00:00:00.000Z',
};

const exhaustedQuota: AiQuotaStatus = {
  used: 10,
  limit: 10,
  remaining: 0,
  resetsAt: '2026-09-09T00:00:00.000Z',
};

const chatResponse: TickerChatResponse = {
  ticker: APPLE_TICKER,
  reply: ASSISTANT_REPLY,
  disclaimer: 'Not financial advice.',
  quota: { ...availableQuota, remaining: 8, used: 2 },
  sources: [],
  groundingEnabled: true,
  factCheck: {
    quoteVerified: true,
    holdingVerified: true,
    corrected: true,
    livePrice: 150,
    currency: 'USD',
    changePercent: 1.25,
    shares: 10,
    avgBuyPrice: 120,
  },
};

interface DrawerProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onWidthChange?: (widthPx: number) => void;
  onResizingChange?: (isResizing: boolean) => void;
}

function renderDrawer({
  isOpen = true,
  onOpenChange = jest.fn(),
  onWidthChange = jest.fn(),
  onResizingChange = jest.fn(),
}: DrawerProps = {}) {
  return render(
    <TickerChatDrawer
      ticker={APPLE_TICKER}
      companyName={APPLE_COMPANY_NAME}
      isOpen={isOpen}
      widthPx={TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX}
      onOpenChange={onOpenChange}
      onWidthChange={onWidthChange}
      onResizingChange={onResizingChange}
    />
  );
}

describe('TickerChatDrawer', () => {
  let uuidCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    uuidCounter = 0;
    jest.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-00000000000${uuidCounter}`;
    });
    Element.prototype.scrollIntoView = jest.fn();
    Element.prototype.setPointerCapture = jest.fn();
    Element.prototype.releasePointerCapture = jest.fn();
    Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
    jest.mocked(fetchTickerChatQuota).mockResolvedValue(availableQuota);
    jest.mocked(sendTickerChatMessage).mockResolvedValue(chatResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens from the FAB and loads quota', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const onWidthChange = jest.fn();
    renderDrawer({ isOpen: false, onOpenChange, onWidthChange });

    await user.click(screen.getByRole('button', { name: 'Open AI chat' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onWidthChange).toHaveBeenCalledWith(TICKER_CHAT_DRAWER_DEFAULT_WIDTH_PX);
  });

  it('shows quota, empty state, and holding-context help when open', async () => {
    renderDrawer();

    expect(await screen.findByText('9/10 left today')).toBeInTheDocument();
    expect(screen.getByText(`${APPLE_TICKER} · ${APPLE_COMPANY_NAME}`)).toBeInTheDocument();
    expect(screen.getByText(`Ask about ${APPLE_TICKER}`)).toBeInTheDocument();
    expect(screen.getByText(TICKER_CHAT_INCLUDE_HOLDING_LABEL)).toBeInTheDocument();
    expect(screen.getByText(TICKER_CHAT_INCLUDE_HOLDING_TOOLTIP)).toBeInTheDocument();
  });

  it('shows a quota error when the quota request fails', async () => {
    jest.mocked(fetchTickerChatQuota).mockRejectedValue({});
    renderDrawer();

    expect(await screen.findByText(ERROR_MESSAGES.AI_TICKER_CHAT_QUOTA_FAILED)).toBeInTheDocument();
  });

  it('sends a typed message and renders the assistant reply with quote checks', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await screen.findByText('9/10 left today');

    await user.type(screen.getByLabelText(`Message about ${APPLE_TICKER}`), USER_QUESTION);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(ASSISTANT_REPLY)).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText(TICKER_CHAT_QUOTE_CHECKED_LABEL)).toBeInTheDocument();
    expect(screen.getByText(TICKER_CHAT_WEB_SEARCH_LABEL)).toBeInTheDocument();
    expect(screen.getByText(TICKER_CHAT_FACT_CHECK_CORRECTED_LABEL)).toBeInTheDocument();
    expect(sendTickerChatMessage).toHaveBeenCalledWith({
      ticker: APPLE_TICKER,
      message: USER_QUESTION,
      history: [],
      includeHoldingContext: false,
    });
  });

  it('sends a suggestion prompt and persists holding context', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await screen.findByText('9/10 left today');

    await user.click(screen.getByRole('checkbox', { name: TICKER_CHAT_INCLUDE_HOLDING_LABEL }));
    expect(sessionStorage.getItem(TICKER_CHAT_INCLUDE_HOLDING_STORAGE_KEY)).toBe('true');

    const suggestion = TICKER_CHAT_SUGGESTION_PROMPTS[0].replaceAll('{ticker}', APPLE_TICKER);
    await user.click(screen.getAllByRole('button', { name: suggestion })[0]);

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: APPLE_TICKER,
          message: suggestion,
          includeHoldingContext: true,
        })
      );
    });
  });

  it('rejects an empty message and restores the draft when send fails', async () => {
    const user = userEvent.setup();
    renderDrawer();
    await screen.findByText('9/10 left today');

    fireEvent.submit(
      screen.getByLabelText(`Message about ${APPLE_TICKER}`).closest('form') as HTMLFormElement
    );
    expect(
      await screen.findByText(ERROR_MESSAGES.AI_TICKER_CHAT_EMPTY_MESSAGE)
    ).toBeInTheDocument();

    jest.mocked(sendTickerChatMessage).mockRejectedValue({});
    const composer = screen.getByLabelText(`Message about ${APPLE_TICKER}`);
    await user.type(composer, USER_QUESTION);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(ERROR_MESSAGES.AI_TICKER_CHAT_FAILED)).toBeInTheDocument();
    expect(composer).toHaveValue(USER_QUESTION);
  });

  it('blocks sends when the daily quota is exhausted', async () => {
    jest.mocked(fetchTickerChatQuota).mockResolvedValue(exhaustedQuota);
    renderDrawer();
    await screen.findByText('0/10 left today');

    const composer = screen.getByLabelText(`Message about ${APPLE_TICKER}`);
    fireEvent.change(composer, { target: { value: USER_QUESTION } });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();

    fireEvent.submit(composer.closest('form') as HTMLFormElement);
    expect(
      await screen.findByText(`Daily AI chat limit reached (${exhaustedQuota.limit} per day).`)
    ).toBeInTheDocument();
    expect(sendTickerChatMessage).not.toHaveBeenCalled();
  });

  it('closes the drawer, resizes the panel, and pauses the suggestion marquee', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    const onWidthChange = jest.fn();
    const onResizingChange = jest.fn();
    renderDrawer({ onOpenChange, onWidthChange, onResizingChange });
    await screen.findByText('9/10 left today');

    const handle = screen.getByRole('separator', { name: 'Resize AI chat panel' });
    fireEvent.pointerDown(handle, { clientX: 400, pointerId: 1 });
    expect(onResizingChange).toHaveBeenCalledWith(true);
    fireEvent.pointerMove(handle, { clientX: 300, pointerId: 1 });
    expect(onWidthChange).toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onResizingChange).toHaveBeenCalledWith(false);

    const suggestions = screen.getByLabelText('Suggested questions');
    fireEvent.pointerEnter(suggestions);
    fireEvent.wheel(suggestions, { deltaY: 40, deltaX: 0 });
    fireEvent.pointerLeave(suggestions);

    await user.click(screen.getByRole('button', { name: 'Close AI chat' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('restores the ticker thread and draft after leaving the page', async () => {
    const user = userEvent.setup();
    let view = renderDrawer();
    await screen.findByText('9/10 left today');

    const composer = screen.getByLabelText(`Message about ${APPLE_TICKER}`);
    fireEvent.change(composer, { target: { value: 'draft to keep' } });
    view.unmount();

    view = renderDrawer();
    expect(screen.getByLabelText(`Message about ${APPLE_TICKER}`)).toHaveValue('draft to keep');

    const savedQuestion = 'How did services revenue change?';
    await user.clear(screen.getByLabelText(`Message about ${APPLE_TICKER}`));
    await user.type(screen.getByLabelText(`Message about ${APPLE_TICKER}`), savedQuestion);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(ASSISTANT_REPLY)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close AI chat' }));
    view.unmount();

    view = renderDrawer();
    expect(await screen.findByText(ASSISTANT_REPLY)).toBeInTheDocument();
    expect(screen.getByText(savedQuestion)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New chat' }));
    expect(screen.queryByText(ASSISTANT_REPLY)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument();
    view.unmount();
  });

  it('sends the on-screen comparison and draws the returned bars', async () => {
    saveCompareChatScreen([
      { ticker: 'AAPL', name: 'Apple' },
      { ticker: 'MSFT', name: 'Microsoft' },
    ]);
    jest.mocked(sendTickerChatMessage).mockResolvedValue({
      ...chatResponse,
      reply: 'Margins differ. Not a trade recommendation.',
      displayBlocks: [
        {
          kind: 'compare-bars',
          metricKey: 'peRatio',
          title: 'P/E',
          unit: 'multiple',
          rows: [
            { ticker: 'AAPL', name: 'Apple', value: 28.4 },
            { ticker: 'MSFT', name: 'Microsoft', value: 35.2 },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Comparison: AAPL, MSFT')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this comparison' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_EXPLAIN_MESSAGE,
          screenContext: { kind: 'compare', tickers: ['AAPL', 'MSFT'] },
        })
      );
    });
    expect(await screen.findByText('28.4x')).toBeInTheDocument();
    expect(screen.getByText('35.2x')).toBeInTheDocument();
  });

  it('sends the calculated backtest and draws its return bars', async () => {
    saveBacktestChatScreen({
      kind: 'backtest',
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
      allocations: [{ ticker: 'AAPL', name: 'Apple', weightPercent: 100 }],
    });
    jest.mocked(sendTickerChatMessage).mockResolvedValue({
      ...chatResponse,
      reply: 'The backtest beat the benchmark. Not a trade recommendation.',
      displayBlocks: [
        {
          kind: 'backtest-bars',
          title: '3 Years',
          rows: [
            { label: 'Portfolio', returnPercent: 42 },
            { label: 'S&P 500', returnPercent: 30 },
            { label: 'AAPL', returnPercent: 42 },
          ],
        },
      ],
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Backtest: AAPL 100% · 3Y')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this backtest' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_BACKTEST_EXPLAIN_MESSAGE,
          screenContext: {
            kind: 'backtest',
            period: '3y',
            amount: 1000,
            displayCurrency: 'USD',
            allocations: [{ ticker: 'AAPL', weightPercent: 100 }],
          },
        })
      );
    });
    expect(await screen.findAllByText('+42.0%')).toHaveLength(2);
    expect(screen.getByText('+30.0%')).toBeInTheDocument();
  });

  it('sends the dividend calendar and draws the monthly payouts', async () => {
    saveDividendsChatScreen('USD');
    jest.mocked(sendTickerChatMessage).mockResolvedValue({
      ...chatResponse,
      reply: 'January is the largest month. Not a trade recommendation.',
      displayBlocks: [
        {
          kind: 'payout-bars',
          title: '2026 payouts',
          currency: 'USD',
          rows: [{ label: 'Jan', amount: 12 }],
        },
      ],
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Dividend calendar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this calendar' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_DIVIDENDS_EXPLAIN_MESSAGE,
          screenContext: { kind: 'dividends', displayCurrency: 'USD' },
        })
      );
    });
    expect(await screen.findByText('12.00')).toBeInTheDocument();
  });

  it('sends the chart period the ticker page is showing', async () => {
    saveTickerChatScreen('1y');
    jest.mocked(sendTickerChatMessage).mockResolvedValue(chatResponse);
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Chart: 1Y')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this chart' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_TICKER_EXPLAIN_MESSAGE,
          screenContext: { kind: 'ticker', period: '1y' },
        })
      );
    });
  });

  it('sends portfolio weights and draws them', async () => {
    savePortfolioChatScreen('USD');
    jest.mocked(sendTickerChatMessage).mockResolvedValue({
      ...chatResponse,
      reply: 'Apple is the whole portfolio. Not a trade recommendation.',
      displayBlocks: [
        {
          kind: 'weight-bars',
          title: 'Portfolio weights',
          rows: [{ label: 'AAPL', weightPercent: 100 }],
        },
      ],
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Portfolio weights')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain these weights' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_PORTFOLIO_EXPLAIN_MESSAGE,
          screenContext: { kind: 'portfolio', displayCurrency: 'USD' },
        })
      );
    });
    expect(await screen.findByText('100.0%')).toBeInTheDocument();
  });

  it('sends the portfolio headlines', async () => {
    saveNewsChatScreen();
    jest.mocked(sendTickerChatMessage).mockResolvedValue({
      ...chatResponse,
      reply: 'The headline mentions Apple. Not a trade recommendation.',
      displayBlocks: [
        {
          kind: 'headline-list',
          title: 'Headlines',
          rows: [{ ticker: 'AAPL', headline: 'Apple updates a product line' }],
        },
      ],
    });
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Portfolio news')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain these headlines' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_NEWS_EXPLAIN_MESSAGE,
          screenContext: { kind: 'news' },
        })
      );
    });
    expect(await screen.findByText('Apple updates a product line')).toBeInTheDocument();
  });

  it('sends the watchlist', async () => {
    saveWatchlistChatScreen();
    jest.mocked(sendTickerChatMessage).mockResolvedValue(chatResponse);
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Watchlist')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain this watchlist' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: TICKER_CHAT_SCREEN_WATCHLIST_EXPLAIN_MESSAGE,
          screenContext: { kind: 'watchlist' },
        })
      );
    });
  });

  it('attaches the current page snapshot to a typed question', async () => {
    saveWatchlistChatScreen();
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('Watchlist')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Stop using this screen' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Compare with/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(`Message about ${APPLE_TICKER}`), USER_QUESTION);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(sendTickerChatMessage).toHaveBeenCalledWith({
        ticker: APPLE_TICKER,
        message: USER_QUESTION,
        history: [],
        includeHoldingContext: false,
        screenContext: { kind: 'watchlist' },
      });
    });
  });

  it('shows the quota skeleton while quota is loading', () => {
    jest.mocked(fetchTickerChatQuota).mockReturnValue(new Promise(() => undefined));
    renderDrawer();

    expect(screen.getByLabelText(LOADING_MESSAGES.AI_QUOTA)).toBeInTheDocument();
  });
});
