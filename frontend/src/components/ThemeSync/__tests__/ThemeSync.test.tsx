import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { PREFERS_COLOR_SCHEME_LIGHT_QUERY } from '../../../constants';
import { createTestStore } from '../../../__tests__/renderWithProviders';
import { ThemeSync } from '../ThemeSync';

describe('ThemeSync', () => {
  it('follows the system theme until the user stores a preference', () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === PREFERS_COLOR_SCHEME_LIGHT_QUERY,
      media: query,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;

    const store = createTestStore();
    const { unmount } = render(
      <Provider store={store}>
        <ThemeSync />
      </Provider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
    listeners[0]?.({ matches: true } as MediaQueryListEvent);
    unmount();
  });
});
