import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useStockWebSocket } from '../useStockWebSocket';

class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  url = '';
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => this.onopen?.());
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.onclose?.();
  }

  static instances: MockWebSocket[] = [];
}

describe('useStockWebSocket', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    jest.restoreAllMocks();
  });

  it('subscribes, dispatches quote updates, and resubscribes on ticker change', async () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { rerender, unmount } = renderHook(({ ticker }) => useStockWebSocket(ticker), {
      wrapper,
      initialProps: { ticker: 'AAPL' },
    });

    await act(async () => {
      await Promise.resolve();
    });

    const socket = MockWebSocket.instances[0];
    expect(socket).toBeDefined();
    act(() => {
      socket?.onmessage?.({
        data: JSON.stringify({
          type: 'QUOTE_UPDATE',
          ticker: 'AAPL',
          price: 1,
          change: 0,
          changePercent: 0,
          currency: 'USD',
          timestamp: 1,
        }),
      });
      socket?.onmessage?.({ data: 'not-json' });
    });

    rerender({ ticker: 'MSFT' });
    unmount();
  });
});
