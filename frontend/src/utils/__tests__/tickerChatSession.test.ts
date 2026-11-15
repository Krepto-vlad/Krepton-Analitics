import {
  TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SESSION_MAX_TICKERS,
  TICKER_CHAT_SESSION_STORAGE_KEY,
} from '../../constants';
import type { TickerChatUiMessage } from '../../types/ai.types';
import {
  clearTickerChatSession,
  loadActiveTickerChat,
  loadAppChatSession,
  loadChatScreenContext,
  loadCompareOffer,
  loadTickerChatSession,
  rememberTickerVisit,
  saveActiveTickerChat,
  saveAppChatSession,
  saveBacktestChatScreen,
  saveCompareChatScreen,
  saveDividendsChatScreen,
  saveNewsChatScreen,
  savePortfolioChatScreen,
  saveTickerChatScreen,
  saveTickerChatSession,
  saveWatchlistChatScreen,
} from '../tickerChatSession';

function createStoredChatMessage(messageId: string, content: string): TickerChatUiMessage {
  return { id: messageId, role: 'user', content };
}

describe('tickerChatSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    let nowMs = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => {
      nowMs += 1;
      return nowMs;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restores a ticker thread and ignores another ticker', () => {
    saveTickerChatSession('aapl', [createStoredChatMessage('1', 'hello')], 'draft');
    saveTickerChatSession('msft', [createStoredChatMessage('2', 'other')], '');

    expect(loadTickerChatSession('aapl')).toEqual({
      messages: [createStoredChatMessage('1', 'hello')],
      draft: 'draft',
    });
    expect(loadTickerChatSession('msft').messages[0]?.content).toBe('other');
  });

  it('hides the model-only sentence from a saved user message', () => {
    saveTickerChatSession(
      'NVDA',
      [
        createStoredChatMessage(
          '1',
          'What do the fundamentals say about this company? Do not recommend a trade.'
        ),
      ],
      ''
    );

    expect(loadTickerChatSession('NVDA').messages[0]?.content).toBe(
      'What do the fundamentals say about this company?'
    );
  });

  it('keeps a one-company metric card in the saved thread', () => {
    saveTickerChatSession(
      'TTWO',
      [
        {
          id: '1',
          role: 'assistant',
          content: 'Margins are compressed.',
          displayBlocks: [
            {
              kind: 'compare-bars',
              metricKey: 'peRatio',
              title: 'P/E',
              unit: 'multiple',
              rows: [{ ticker: 'TTWO', name: 'Take-Two', value: 20 }],
            },
          ],
        },
      ],
      ''
    );

    expect(loadTickerChatSession('TTWO').messages[0]?.displayBlocks).toEqual([
      {
        kind: 'compare-bars',
        metricKey: 'peRatio',
        title: 'P/E',
        unit: 'multiple',
        rows: [{ ticker: 'TTWO', name: 'Take-Two', value: 20 }],
      },
    ]);
  });

  it('drops an empty thread and clears the tab on logout', () => {
    saveTickerChatSession('AAPL', [createStoredChatMessage('1', 'hello')], '');
    saveTickerChatSession('AAPL', [], '   ');
    expect(sessionStorage.getItem(TICKER_CHAT_SESSION_STORAGE_KEY)).toBeNull();

    saveTickerChatSession('AAPL', [createStoredChatMessage('1', 'hello')], '');
    clearTickerChatSession();
    expect(loadTickerChatSession('AAPL')).toEqual({ messages: [], draft: '' });
  });

  it('keeps only the newest ticker threads', () => {
    for (let tickerIndex = 0; tickerIndex < TICKER_CHAT_SESSION_MAX_TICKERS + 1; tickerIndex += 1) {
      saveTickerChatSession(
        `T${tickerIndex}`,
        [createStoredChatMessage(String(tickerIndex), `note ${tickerIndex}`)],
        ''
      );
    }

    expect(loadTickerChatSession('T0').messages).toEqual([]);
    expect(loadTickerChatSession(`T${TICKER_CHAT_SESSION_MAX_TICKERS}`).messages).toHaveLength(1);
  });

  it('remembers the last ticker after the thread is cleared', () => {
    saveActiveTickerChat('msft', 'Microsoft Corporation');
    saveTickerChatSession('MSFT', [], '   ');

    expect(loadActiveTickerChat()).toEqual({
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
    });
    clearTickerChatSession();
    expect(loadActiveTickerChat()).toBeNull();
  });

  it('keeps the comparison screen beside the thread', () => {
    saveCompareChatScreen([
      { ticker: 'msft', name: 'Microsoft' },
      { ticker: 'aapl', name: 'Apple' },
    ]);
    saveTickerChatSession(
      'MSFT',
      [
        {
          id: '1',
          role: 'assistant',
          content: 'Margins differ.',
          displayBlocks: [
            {
              kind: 'compare-bars',
              metricKey: 'peRatio',
              title: 'P/E',
              unit: 'multiple',
              rows: [
                { ticker: 'MSFT', name: 'Microsoft', value: 35.2 },
                { ticker: 'AAPL', name: 'Apple', value: 28.4 },
              ],
            },
          ],
        },
      ],
      ''
    );

    expect(loadChatScreenContext()).toEqual({
      kind: 'compare',
      tickers: [
        { ticker: 'MSFT', name: 'Microsoft' },
        { ticker: 'AAPL', name: 'Apple' },
      ],
    });
    expect(loadActiveTickerChat()?.ticker).toBe('MSFT');
    expect(loadTickerChatSession('MSFT').messages[0]?.displayBlocks).toHaveLength(1);

    saveCompareChatScreen([{ ticker: 'MSFT', name: 'Microsoft' }]);
    expect(loadChatScreenContext()).toBeNull();
    expect(loadTickerChatSession('MSFT').messages).toHaveLength(1);
  });

  it('stores a calculated backtest and drops an incomplete bar row', () => {
    saveBacktestChatScreen({
      kind: 'backtest',
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
      allocations: [
        { ticker: 'aapl', name: 'Apple', weightPercent: 60 },
        { ticker: 'MSFT', name: 'Microsoft', weightPercent: 40 },
      ],
    });

    expect(loadChatScreenContext()).toEqual({
      kind: 'backtest',
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
      allocations: [
        { ticker: 'AAPL', name: 'Apple', weightPercent: 60 },
        { ticker: 'MSFT', name: 'Microsoft', weightPercent: 40 },
      ],
    });

    saveBacktestChatScreen({
      kind: 'backtest',
      period: '3y',
      amount: 1000,
      displayCurrency: 'USD',
      allocations: [{ ticker: 'AAPL', name: 'Apple', weightPercent: 40 }],
    });
    expect(loadChatScreenContext()).toBeNull();

    saveTickerChatSession(
      'AAPL',
      [
        {
          id: 'backtest-1',
          role: 'assistant',
          content: 'The result is above.',
          displayBlocks: [
            {
              kind: 'backtest-bars',
              title: '3 Years',
              rows: [
                { label: 'Portfolio', returnPercent: 42 },
                { label: 'Broken', returnPercent: Number.NaN },
              ],
            },
          ],
        },
      ],
      ''
    );

    expect(loadTickerChatSession('AAPL').messages[0]?.displayBlocks).toEqual([
      {
        kind: 'backtest-bars',
        title: '3 Years',
        rows: [{ label: 'Portfolio', returnPercent: 42 }],
      },
    ]);
  });

  it('stores a dividend calendar and a chart period', () => {
    saveDividendsChatScreen('EUR');
    expect(loadChatScreenContext()).toEqual({ kind: 'dividends', displayCurrency: 'EUR' });

    saveTickerChatScreen('1y');
    expect(loadChatScreenContext()).toEqual({ kind: 'ticker', period: '1y' });

    saveTickerChatSession(
      'AAPL',
      [
        {
          id: 'payout-1',
          role: 'assistant',
          content: 'January is the largest.',
          displayBlocks: [
            {
              kind: 'payout-bars',
              title: '2026 payouts',
              currency: 'USD',
              rows: [
                { label: 'Jan', amount: 12 },
                { label: 'Broken', amount: Number.NaN },
              ],
            },
          ],
        },
      ],
      ''
    );
    expect(loadTickerChatSession('AAPL').messages[0]?.displayBlocks).toEqual([
      {
        kind: 'payout-bars',
        title: '2026 payouts',
        currency: 'USD',
        rows: [{ label: 'Jan', amount: 12 }],
      },
    ]);
  });

  it('stores portfolio weights, headlines, and the watchlist', () => {
    savePortfolioChatScreen('EUR');
    expect(loadChatScreenContext()).toEqual({ kind: 'portfolio', displayCurrency: 'EUR' });

    saveNewsChatScreen();
    expect(loadChatScreenContext()).toEqual({ kind: 'news' });

    saveWatchlistChatScreen();
    expect(loadChatScreenContext()).toEqual({ kind: 'watchlist' });

    saveTickerChatSession(
      'AAPL',
      [
        {
          id: 'news-1',
          role: 'assistant',
          content: 'One headline.',
          displayBlocks: [
            {
              kind: 'headline-list',
              title: 'Headlines',
              rows: [{ ticker: 'aapl', headline: 'Apple updates a product line' }],
            },
            {
              kind: 'weight-bars',
              title: 'Portfolio weights',
              rows: [{ label: 'AAPL', weightPercent: 100 }],
            },
          ],
        },
      ],
      ''
    );

    expect(loadTickerChatSession('AAPL').messages[0]?.displayBlocks).toEqual([
      {
        kind: 'headline-list',
        title: 'Headlines',
        rows: [{ ticker: 'AAPL', headline: 'Apple updates a product line' }],
      },
      {
        kind: 'weight-bars',
        title: 'Portfolio weights',
        rows: [{ label: 'AAPL', weightPercent: 100 }],
      },
    ]);
  });

  it('rejects a corrupt store and oversized message text', () => {
    sessionStorage.setItem(TICKER_CHAT_SESSION_STORAGE_KEY, '{');
    expect(loadTickerChatSession('AAPL')).toEqual({ messages: [], draft: '' });
    expect(sessionStorage.getItem(TICKER_CHAT_SESSION_STORAGE_KEY)).toBeNull();

    const oversizedMessageContent = 'x'.repeat(TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS + 20);
    saveTickerChatSession('AAPL', [createStoredChatMessage('1', oversizedMessageContent)], '');
    expect(loadTickerChatSession('AAPL').messages[0]?.content).toHaveLength(
      TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS
    );
  });

  it('keeps one app thread and falls back to the open ticker once', () => {
    saveActiveTickerChat('AAPL', 'Apple');
    saveTickerChatSession('AAPL', [createStoredChatMessage('1', 'from apple')], '');
    expect(loadAppChatSession().messages[0]?.content).toBe('from apple');

    saveAppChatSession([createStoredChatMessage('2', 'shared')], 'draft');
    expect(loadAppChatSession().messages[0]?.content).toBe('shared');
    expect(loadAppChatSession().draft).toBe('draft');

    saveTickerChatSession('MSFT', [createStoredChatMessage('3', 'other')], '');
    expect(loadAppChatSession().messages[0]?.content).toBe('shared');
  });

  it('offers the previous ticker after another page is opened', () => {
    rememberTickerVisit('msft', 'Microsoft');
    expect(loadCompareOffer('MSFT')).toBeNull();

    rememberTickerVisit('googl', 'Alphabet');
    expect(loadCompareOffer('GOOGL')).toEqual({ ticker: 'MSFT', companyName: 'Microsoft' });

    rememberTickerVisit('GOOGL', 'Alphabet Inc.');
    expect(loadCompareOffer('GOOGL')).toEqual({ ticker: 'MSFT', companyName: 'Microsoft' });
  });
});
