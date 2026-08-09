import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { useLeaderIntervalWhileVisible } from './useLeaderIntervalWhileVisible';
import { useTabLeader } from '../utils/tabLeader';
import { WATCHLIST_CLIENT_POLL_INTERVAL_MS } from '../constants';
import { selectIsLivePollingScopeActive } from '../features/livePolling/livePollingSlice';
import {
  fetchWatchlistThunk,
  refreshWatchlistQuotesThunk,
  syncWatchlistItems,
} from '../features/watchlist/watchlistSlice';
import type { WatchlistItem } from '../types/watchlist.types';

const WATCHLIST_SYNC_CHANNEL = 'ka-watchlist-sync';

interface WatchlistSyncMessage {
  type: 'WATCHLIST_ITEMS';
  items: WatchlistItem[];
}

function isWatchlistSyncMessage(value: unknown): value is WatchlistSyncMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as WatchlistSyncMessage;
  return message.type === 'WATCHLIST_ITEMS' && Array.isArray(message.items);
}

function buildItemsSignature(items: WatchlistItem[]): string {
  return JSON.stringify(items);
}

/**
 * Keeps watchlist quotes fresh while the watchlist scope is active.
 * Only the leader tab polls the API; all tabs stay in sync via BroadcastChannel.
 * Polling pauses while the document is hidden (Page Visibility API).
 */
export function useWatchlistPolling(): void {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.watchlist.items);
  const isScopeActive = useAppSelector((state) =>
    selectIsLivePollingScopeActive(state, 'watchlist')
  );
  const isLeader = useTabLeader('watchlist-polling');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncedSignatureRef = useRef('');

  useEffect(() => {
    const channel = new BroadcastChannel(WATCHLIST_SYNC_CHANNEL);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent): void => {
      if (!isWatchlistSyncMessage(event.data)) return;

      const signature = buildItemsSignature(event.data.items);
      if (signature === lastSyncedSignatureRef.current) return;

      lastSyncedSignatureRef.current = signature;
      dispatch(syncWatchlistItems(event.data.items));
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isScopeActive) return;

    void dispatch(fetchWatchlistThunk());
  }, [dispatch, isScopeActive]);

  const refreshWatchlistQuotes = useCallback(() => {
    void dispatch(refreshWatchlistQuotesThunk());
  }, [dispatch]);

  useLeaderIntervalWhileVisible({
    isLeader,
    isActive: isScopeActive,
    intervalMs: WATCHLIST_CLIENT_POLL_INTERVAL_MS,
    onTick: refreshWatchlistQuotes,
  });

  useEffect(() => {
    if (!isScopeActive) return;

    const channel = channelRef.current;
    if (!channel) return;

    const signature = buildItemsSignature(items);
    if (signature === lastSyncedSignatureRef.current) return;

    lastSyncedSignatureRef.current = signature;
    channel.postMessage({ type: 'WATCHLIST_ITEMS', items });
  }, [items, isScopeActive]);
}
