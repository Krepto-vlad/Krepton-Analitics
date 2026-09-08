import { DEFAULT_THEME, THEME_STORAGE_KEY } from '../../constants';
import {
  applyThemeToDocument,
  getSystemTheme,
  hasStoredThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveInitialTheme,
} from '../theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('reads and persists an explicit light/dark choice', () => {
    expect(readStoredThemePreference()).toBeNull();
    persistThemePreference('light');
    expect(readStoredThemePreference()).toBe('light');
    expect(hasStoredThemePreference()).toBe(true);
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredThemePreference()).toBeNull();
  });

  it('prefers the stored theme over the system theme', () => {
    persistThemePreference('light');
    expect(resolveInitialTheme()).toBe('light');
  });

  it('falls back to the system theme and applies it to the document', () => {
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(getSystemTheme()).toBe('light');

    applyThemeToDocument('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('returns the default theme when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error jsdom can omit matchMedia
    delete window.matchMedia;
    expect(getSystemTheme()).toBe(DEFAULT_THEME);
    window.matchMedia = original;
  });
});
