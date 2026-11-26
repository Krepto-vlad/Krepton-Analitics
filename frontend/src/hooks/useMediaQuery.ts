import { useSyncExternalStore } from 'react';

function subscribeToMediaQuery(query: string, onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const mediaQueryList = window.matchMedia(query);
  const handleChange = (): void => {
    onStoreChange();
  };

  mediaQueryList.addEventListener('change', handleChange);
  return () => mediaQueryList.removeEventListener('change', handleChange);
}

function readMediaQueryMatch(query: string): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
}

/** Subscribes to a CSS media query and returns whether it currently matches. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
    () => readMediaQueryMatch(query),
    () => false
  );
}
