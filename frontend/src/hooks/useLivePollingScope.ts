import { useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import {
  activateLivePollingScope,
  deactivateLivePollingScope,
  type LivePollingScope,
} from '../features/livePolling/livePollingSlice';

/**
 * Registers a live-polling scope while the current view is mounted.
 * Ref-counted so nested routes and React strict mode stay safe.
 */
export function useLivePollingScope(scope: LivePollingScope | null): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!scope) return;

    dispatch(activateLivePollingScope(scope));

    return () => {
      dispatch(deactivateLivePollingScope(scope));
    };
  }, [dispatch, scope]);
}

const DASHBOARD_LIVE_POLLING_SCOPES = [
  'watchlist',
  'holdings',
] as const satisfies readonly LivePollingScope[];

/**
 * Dashboard shows both watchlist and holdings widgets.
 */
export function useDashboardLivePollingScopes(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    for (const scope of DASHBOARD_LIVE_POLLING_SCOPES) {
      dispatch(activateLivePollingScope(scope));
    }

    return () => {
      for (const scope of DASHBOARD_LIVE_POLLING_SCOPES) {
        dispatch(deactivateLivePollingScope(scope));
      }
    };
  }, [dispatch]);
}
