import { useEffect, useRef, type RefObject } from 'react';

const KEY_ESCAPE = 'Escape';
const KEY_TAB = 'Tab';
const NESTED_POPUP_SELECTOR = '[role="listbox"], [role="dialog"]';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement | null>;
  isActive: boolean;
  onEscape?: () => void;
  lockBodyScroll?: boolean;
}

function isDisplayed(element: HTMLElement): boolean {
  if (element.tabIndex < 0) {
    return false;
  }

  if (element.hidden || element.closest('[hidden], [inert]')) {
    return false;
  }

  if (element.getAttribute('aria-hidden') === 'true' || element.closest('[aria-hidden="true"]')) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isDisplayed
  );
}

function hasNestedPopup(container: HTMLElement): boolean {
  return container.querySelector(NESTED_POPUP_SELECTOR) !== null;
}

/**
 * Keeps Tab inside an open dialog/drawer, restores focus on close, and handles Escape.
 * Nested listboxes/date dialogs get the first Escape so they can close before the parent.
 */
export function useFocusTrap({
  containerRef,
  isActive,
  onEscape,
  lockBodyScroll = true,
}: UseFocusTrapOptions): void {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const maybeDialog = containerRef.current;
    if (!maybeDialog) {
      return;
    }
    const dialogNode: HTMLElement = maybeDialog;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;

    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    dialogNode.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === KEY_ESCAPE) {
        if (hasNestedPopup(dialogNode) || !onEscapeRef.current) {
          return;
        }

        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== KEY_TAB) {
        return;
      }

      const tabbableElements = getFocusableElements(dialogNode);
      if (tabbableElements.length === 0) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }

      const firstElement = tabbableElements[0];
      const lastElement = tabbableElements[tabbableElements.length - 1];
      const activeElement = document.activeElement;
      const isInside = activeElement instanceof Node && dialogNode.contains(activeElement);

      if (
        event.shiftKey &&
        (activeElement === firstElement || activeElement === dialogNode || !isInside)
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && (activeElement === lastElement || !isInside)) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (lockBodyScroll) {
        document.body.style.overflow = previousBodyOverflow;
      }

      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, isActive, lockBodyScroll]);
}
