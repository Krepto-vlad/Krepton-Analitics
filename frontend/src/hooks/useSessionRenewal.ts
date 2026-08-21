import { useEffect, useRef } from 'react';
import { SESSION_ACTIVITY_EVENTS, SESSION_ACTIVITY_THROTTLE_MS } from '../constants';
import { extendSessionThunk } from '../features/auth/authSlice';
import { isSessionDueForRenewal } from '../utils/sessionRenewal';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';

export function useSessionRenewal(): void {
  const dispatch = useAppDispatch();
  const sessionExpiresAt = useAppSelector((state) => state.auth.user?.sessionExpiresAt);
  const lastAttemptAtMsRef = useRef(0);

  useEffect(() => {
    if (!sessionExpiresAt) {
      return;
    }

    const tryRenew = (): void => {
      if (!isSessionDueForRenewal(sessionExpiresAt)) {
        return;
      }

      const nowMs = Date.now();
      if (nowMs - lastAttemptAtMsRef.current < SESSION_ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastAttemptAtMsRef.current = nowMs;
      void dispatch(extendSessionThunk());
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        tryRenew();
      }
    };

    for (const eventName of SESSION_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, tryRenew);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      for (const eventName of SESSION_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, tryRenew);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [dispatch, sessionExpiresAt]);
}
