import { useEffect, useRef } from 'react';
import { usePageVisibility } from './usePageVisibility';

interface UseLeaderIntervalWhileVisibleOptions {
  isLeader: boolean;
  isActive: boolean;
  intervalMs: number;
  onTick: () => void;
}

/**
 * Runs a leader-only interval while the document is visible.
 * Pauses on Page Visibility hidden and fires one catch-up tick when visible again.
 */
export function useLeaderIntervalWhileVisible({
  isLeader,
  isActive,
  intervalMs,
  onTick,
}: UseLeaderIntervalWhileVisibleOptions): void {
  const isPageVisible = usePageVisibility();
  const wasPageHiddenRef = useRef(false);

  useEffect(() => {
    if (!isLeader || !isActive) {
      return;
    }

    if (!isPageVisible) {
      wasPageHiddenRef.current = true;
      return;
    }

    if (wasPageHiddenRef.current) {
      wasPageHiddenRef.current = false;
      onTick();
    }

    const intervalId = setInterval(onTick, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, isLeader, isPageVisible, intervalMs, onTick]);
}
