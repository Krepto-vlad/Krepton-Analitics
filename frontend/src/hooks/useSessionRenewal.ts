import { useEffect, useRef } from 'react';
import { SESSION_ACTIVITY_EVENTS, SESSION_ACTIVITY_THROTTLE_MS } from '../constants';
import { extendSessionThunk } from '../features/auth/authSlice';
import { getMsUntilSessionRenewalDue, isSessionDueForRenewal } from '../utils/sessionRenewal';
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

    const expiresAt = sessionExpiresAt;
    let timeoutId = 0;

    function scheduleUpcomingRenewal(): void {
      const delayMs = getMsUntilSessionRenewalDue(expiresAt);
      if (delayMs !== null && delayMs > 0) {
        timeoutId = window.setTimeout(tryRenew, delayMs);
      }
    }

    function tryRenew(): void {
      window.clearTimeout(timeoutId);

      if (document.visibilityState !== 'visible') {
        scheduleUpcomingRenewal();
        return;
      }

      if (!isSessionDueForRenewal(expiresAt)) {
        scheduleUpcomingRenewal();
        return;
      }

      const nowMs = Date.now();
      const waitMs = SESSION_ACTIVITY_THROTTLE_MS - (nowMs - lastAttemptAtMsRef.current);
      if (waitMs > 0) {
        timeoutId = window.setTimeout(tryRenew, waitMs);
        return;
      }

      lastAttemptAtMsRef.current = nowMs;
      void dispatch(extendSessionThunk());
      timeoutId = window.setTimeout(tryRenew, SESSION_ACTIVITY_THROTTLE_MS);
    }

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        tryRenew();
      }
    };

    tryRenew();

    const activityListenerOptions: AddEventListenerOptions = { passive: true };
    for (const eventName of SESSION_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, tryRenew, activityListenerOptions);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      for (const eventName of SESSION_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, tryRenew, activityListenerOptions);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [dispatch, sessionExpiresAt]);
}
