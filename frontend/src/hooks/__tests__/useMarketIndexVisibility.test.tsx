import { act, renderHook } from '@testing-library/react';
import {
  DASHBOARD_MARKET_INDICES,
  DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
} from '../../constants';
import { useMarketIndexVisibility } from '../useMarketIndexVisibility';

describe('useMarketIndexVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows every index by default', () => {
    const { result } = renderHook(() => useMarketIndexVisibility());

    expect(result.current.visibleIndices).toHaveLength(DASHBOARD_MARKET_INDICES.length);
    expect(result.current.isIndexVisible('^GSPC')).toBe(true);
  });

  it('hides and restores an index and saves the choice', () => {
    const { result } = renderHook(() => useMarketIndexVisibility());

    act(() => result.current.setIndexVisible('^DJI', false));

    expect(result.current.isIndexVisible('^DJI')).toBe(false);
    expect(result.current.visibleIndices.map((index) => index.ticker)).not.toContain('^DJI');

    const saved = JSON.parse(
      localStorage.getItem(DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY) ?? '{}'
    ) as { visibleOrderedTickers: string[] };
    expect(saved.visibleOrderedTickers).not.toContain('^DJI');

    act(() => result.current.setIndexVisible('^DJI', true));

    expect(result.current.isIndexVisible('^DJI')).toBe(true);
  });

  it('restores the saved order on the next load', () => {
    localStorage.setItem(
      DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        visibleOrderedTickers: ['^RUT', '^GSPC'],
        knownTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
      })
    );

    const { result } = renderHook(() => useMarketIndexVisibility());

    expect(result.current.visibleIndices.map((index) => index.ticker)).toEqual(['^RUT', '^GSPC']);
  });

  it('reorders visible cards', () => {
    const { result } = renderHook(() => useMarketIndexVisibility());

    act(() => result.current.moveVisibleIndex(0, 2));

    expect(result.current.visibleIndices.map((index) => index.ticker)).toEqual([
      '^IXIC',
      '^DJI',
      '^GSPC',
      '^RUT',
    ]);
  });
});
