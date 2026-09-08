import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { persistThemePreference } from '../../utils/theme';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles and persists the theme', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });
    const initialTheme = result.current.theme;

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).not.toBe(initialTheme);

    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');
    expect(persistThemePreference).toBeDefined();
  });
});
