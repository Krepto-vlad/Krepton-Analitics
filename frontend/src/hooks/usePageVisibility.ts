import { useEffect, useState } from 'react';

function readIsPageVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

/**
 * Tracks whether the document is currently visible to the user.
 * Uses the Page Visibility API (`visibilitychange`).
 */
export function usePageVisibility(): boolean {
  const [isPageVisible, setIsPageVisible] = useState(readIsPageVisible);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      setIsPageVisible(readIsPageVisible());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isPageVisible;
}
