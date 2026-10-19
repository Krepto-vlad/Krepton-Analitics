import {
  TICKER_CHAT_SESSION_MAX_MESSAGE_CHARS,
  TICKER_CHAT_SESSION_MAX_TICKERS,
  TICKER_CHAT_SESSION_STORAGE_KEY,
} from '../../constants';
import type { TickerChatUiMessage } from '../../types/ai.types';
import {
  clearTickerChatSession,
  loadActiveTickerChat,
  loadTickerChatSession,
  saveActiveTickerChat,
  saveTickerChatSession,
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
});
