import { useEffect, useRef } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { useTabLeader } from '../utils/tabLeader';
import { HOLDINGS_CLIENT_POLL_INTERVAL_MS } from '../constants';
import { selectIsLivePollingScopeActive } from '../features/livePolling/livePollingSlice';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
  fetchPortfolioEquityHistoryThunk,
  refreshHoldingsQuotesThunk,
  syncHoldingsQuotes,
} from '../features/portfolio/portfolioSlice';
import type { HoldingsQuotesSyncPayload } from '../features/portfolio/portfolioSlice';

const HOLDINGS_SYNC_CHANNEL = 'ka-holdings-sync';

interface HoldingsSyncMessage {
  type: 'HOLDINGS_QUOTES';
  payload: HoldingsQuotesSyncPayload;
}

function isHoldingsSyncMessage(value: unknown): value is HoldingsSyncMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as HoldingsSyncMessage;
  return (
    message.type === 'HOLDINGS_QUOTES' &&
    Array.isArray(message.payload?.summaryPositions) &&
    Array.isArray(message.payload?.positions)
  );
}

function buildHoldingsSignature(payload: HoldingsQuotesSyncPayload): string {
  return JSON.stringify(payload);
}

/**
 * Keeps holdings quotes fresh while the holdings scope is active.
 * Only the leader tab polls the API; all tabs stay in sync via BroadcastChannel.
 */
export function useHoldingsPolling(): void {
  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const positions = useAppSelector((state) => state.portfolio.positions);
  const isScopeActive = useAppSelector((state) =>
    selectIsLivePollingScopeActive(state, 'holdings')
  );
  const isLeader = useTabLeader('holdings-polling');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncedSignatureRef = useRef('');

  useEffect(() => {
    const channel = new BroadcastChannel(HOLDINGS_SYNC_CHANNEL);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent): void => {
      if (!isHoldingsSyncMessage(event.data)) return;

      const signature = buildHoldingsSignature(event.data.payload);
      if (signature === lastSyncedSignatureRef.current) return;

      lastSyncedSignatureRef.current = signature;
      dispatch(syncHoldingsQuotes(event.data.payload));
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isLeader || !isScopeActive) return;

    void dispatch(fetchPortfolioSummaryThunk());
    void dispatch(fetchInvestmentSummaryThunk());
    void dispatch(fetchPositionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchTransactionsPageThunk({ offset: 0, append: false }));
    void dispatch(fetchPortfolioEquityHistoryThunk());
  }, [dispatch, isLeader, isScopeActive]);

  useEffect(() => {
    if (!isLeader || !isScopeActive) return;

    const intervalId = setInterval(() => {
      void dispatch(refreshHoldingsQuotesThunk());
    }, HOLDINGS_CLIENT_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch, isLeader, isScopeActive]);

  useEffect(() => {
    if (!isScopeActive) return;

    const channel = channelRef.current;
    if (!channel) return;
    if (summaryPositions.length === 0 && positions.length === 0) return;

    const payload: HoldingsQuotesSyncPayload = { summaryPositions, positions };
    const signature = buildHoldingsSignature(payload);
    if (signature === lastSyncedSignatureRef.current) return;

    lastSyncedSignatureRef.current = signature;
    channel.postMessage({ type: 'HOLDINGS_QUOTES', payload });
  }, [summaryPositions, positions, isScopeActive]);
}
