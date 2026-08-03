import {
  DEFAULT_THEME,
  PREFERS_COLOR_SCHEME_LIGHT_QUERY,
  THEME_STORAGE_KEY,
  type Theme,
} from '../constants';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_THEME;
  }

  try {
    return window.matchMedia(PREFERS_COLOR_SCHEME_LIGHT_QUERY).matches ? 'light' : 'dark';
  } catch {
    return DEFAULT_THEME;
  }
}

export function readStoredThemePreference(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
  return null;
}

export function hasStoredThemePreference(): boolean {
  return readStoredThemePreference() !== null;
}

/** Explicit user choice wins; otherwise follow OS / browser preference. */
export function resolveInitialTheme(): Theme {
  return readStoredThemePreference() ?? getSystemTheme();
}

export function persistThemePreference(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
}

/** Apply theme to <html> only — does not write localStorage. */
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}
