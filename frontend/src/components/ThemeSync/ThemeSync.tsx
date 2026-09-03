import { useEffect, useLayoutEffect } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setTheme } from '../../features/ui/uiSlice';
import { PREFERS_COLOR_SCHEME_LIGHT_QUERY } from '../../constants';
import { applyThemeToDocument, getSystemTheme, hasStoredThemePreference } from '../../utils/theme';

/**
 * Keeps <html data-theme> in sync with Redux.
 * Follows OS preference until the user explicitly toggles (then localStorage wins).
 */
export function ThemeSync(): null {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(PREFERS_COLOR_SCHEME_LIGHT_QUERY);

    const handleSystemThemeChange = () => {
      if (hasStoredThemePreference()) {
        return;
      }
      dispatch(setTheme(getSystemTheme()));
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [dispatch]);

  return null;
}
