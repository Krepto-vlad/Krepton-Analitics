import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { updateQuoteFromWs } from '../store/stockSlice';
import type { WsServerMessage, WsClientMessage } from '../types/ws.types';
import { API_BASE_URL } from '../constants';

const WS_URL = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
const WS_RECONNECT_DELAY_MS = 3000;

export function useStockWebSocket(ticker: string) {
  const dispatch = useAppDispatch();
  const socketRef = useRef<WebSocket | null>(null);
  const currentTickerRef = useRef<string>(ticker);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const sendMessage = useCallback((message: WsClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const connect = (): void => {
      if (!isMountedRef.current) return;

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected');
        sendMessage({ type: 'SUBSCRIBE', ticker: currentTickerRef.current });
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as WsServerMessage;

          if (message.type === 'QUOTE_UPDATE') {
            dispatch(updateQuoteFromWs(message));
          }
        } catch {
          console.error('[WS] Failed to parse message');
        }
      };

      socket.onclose = () => {
        if (!isMountedRef.current) return;
        console.log(`[WS] Disconnected, reconnecting in ${WS_RECONNECT_DELAY_MS}ms...`);
        reconnectTimerRef.current = setTimeout(connect, WS_RECONNECT_DELAY_MS);
      };

      socket.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [dispatch, sendMessage]);

  useEffect(() => {
    if (ticker === currentTickerRef.current) return;

    sendMessage({ type: 'UNSUBSCRIBE', ticker: currentTickerRef.current });
    currentTickerRef.current = ticker;
    sendMessage({ type: 'SUBSCRIBE', ticker });
  }, [ticker, sendMessage]);
}
