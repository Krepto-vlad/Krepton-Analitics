import { useEffect } from 'react';
import { SESSION_EXPIRY_SKEW_MS } from '../constants';
import { expireClientSession } from '../features/auth/expireClientSession';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';

function getRemainingSessionMs(sessionExpiresAt: string): number {
  return Date.parse(sessionExpiresAt) - Date.now() - SESSION_EXPIRY_SKEW_MS;
}

export function useSessionExpiry(): void {
  const dispatch = useAppDispatch();
  const sessionExpiresAt = useAppSelector((state) => state.auth.user?.sessionExpiresAt);

  useEffect(() => {
    if (!sessionExpiresAt) {
      return;
    }

    const expireNow = (): void => {
      expireClientSession(dispatch);
    };

    const remainingMs = getRemainingSessionMs(sessionExpiresAt);
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      expireNow();
      return;
    }

    const timeoutId = window.setTimeout(expireNow, remainingMs);

    const onVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const remainingWhenVisible = getRemainingSessionMs(sessionExpiresAt);
      if (!Number.isFinite(remainingWhenVisible) || remainingWhenVisible <= 0) {
        expireNow();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [dispatch, sessionExpiresAt]);
}
