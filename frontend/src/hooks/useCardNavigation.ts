import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY,
  DASHBOARD_CARD_NAVIGATION_DELAY_MS,
  DASHBOARD_CARD_NAVIGATION_IGNORE_SELECTOR,
  DASHBOARD_ROW_NAVIGATION_ATTRIBUTE,
} from '../constants';

const SINGLE_CLICK_DETAIL = 1;

function hasSelectedText(): boolean {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().length > 0;
}

function isMobileViewport(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DASHBOARD_CARD_MOBILE_VIEWPORT_QUERY).matches
  );
}

/**
 * Makes a whole card open `destination` on a mouse click while leaving text selection,
 * buttons, links, and charts alone. Keyboard and screen reader users reach the same
 * destination through the card's corner link, so the card itself stays a plain element.
 * A row marked with `data-row-navigation-path` opens its own path instead. Pass `null` to
 * switch navigation off. On phones only the corner link navigates.
 */
export function useCardNavigation(destination: string | null) {
  const navigate = useNavigate();
  const pendingNavigationRef = useRef<number | null>(null);

  const cancelPendingNavigation = useCallback(() => {
    if (pendingNavigationRef.current !== null) {
      window.clearTimeout(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingNavigation, [cancelPendingNavigation]);

  return useCallback(
    (event: MouseEvent<HTMLElement>) => {
      cancelPendingNavigation();

      if (
        destination === null ||
        event.detail !== SINGLE_CLICK_DETAIL ||
        isMobileViewport() ||
        !(event.target instanceof Element) ||
        event.target.closest(DASHBOARD_CARD_NAVIGATION_IGNORE_SELECTOR) !== null
      ) {
        return;
      }

      const rowDestination = event.target
        .closest(`[${DASHBOARD_ROW_NAVIGATION_ATTRIBUTE}]`)
        ?.getAttribute(DASHBOARD_ROW_NAVIGATION_ATTRIBUTE);
      const targetPath = rowDestination ?? destination;

      pendingNavigationRef.current = window.setTimeout(() => {
        pendingNavigationRef.current = null;
        if (!hasSelectedText()) {
          navigate(targetPath);
        }
      }, DASHBOARD_CARD_NAVIGATION_DELAY_MS);
    },
    [destination, navigate, cancelPendingNavigation]
  );
}
