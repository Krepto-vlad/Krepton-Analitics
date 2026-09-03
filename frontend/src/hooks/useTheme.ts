import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { setTheme, toggleTheme as toggleThemeAction } from '../features/ui/uiSlice';
import { persistThemePreference } from '../utils/theme';
import type { Theme } from '../constants';

export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
} {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  return {
    theme,
    toggleTheme: () => {
      const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
      dispatch(toggleThemeAction());
      persistThemePreference(nextTheme);
    },
    setTheme: (nextTheme: Theme) => {
      dispatch(setTheme(nextTheme));
      persistThemePreference(nextTheme);
    },
  };
}
