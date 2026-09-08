import { renderHook, act } from '@testing-library/react';
import { TAB_LEADER_TTL_MS } from '../../constants';
import { useTabLeader } from '../tabLeader';

describe('useTabLeader', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('claims leadership when no record exists', () => {
    const { result } = renderHook(() => useTabLeader('watchlist'));
    expect(result.current).toBe(true);
    expect(localStorage.getItem('ka-tab-leader:watchlist')).toContain('tabId');
  });

  it('does not steal a fresh leader from another tab', () => {
    localStorage.setItem(
      'ka-tab-leader:watchlist',
      JSON.stringify({ tabId: 'other-tab', lastHeartbeat: Date.now() })
    );

    const { result } = renderHook(() => useTabLeader('watchlist'));
    expect(result.current).toBe(false);
  });

  it('takes over after the previous leader expires', () => {
    localStorage.setItem(
      'ka-tab-leader:watchlist',
      JSON.stringify({ tabId: 'stale-tab', lastHeartbeat: Date.now() - TAB_LEADER_TTL_MS - 10 })
    );

    const { result } = renderHook(() => useTabLeader('watchlist'));
    expect(result.current).toBe(true);
  });

  it('ignores invalid stored JSON', () => {
    localStorage.setItem('ka-tab-leader:watchlist', '{bad');
    const { result } = renderHook(() => useTabLeader('watchlist'));
    expect(result.current).toBe(true);
  });

  it('reacts to storage events from other tabs', () => {
    const { result } = renderHook(() => useTabLeader('watchlist'));
    expect(result.current).toBe(true);

    act(() => {
      localStorage.setItem(
        'ka-tab-leader:watchlist',
        JSON.stringify({ tabId: 'other-tab', lastHeartbeat: Date.now() })
      );
      window.dispatchEvent(new StorageEvent('storage', { key: 'ka-tab-leader:watchlist' }));
    });

    expect(result.current).toBe(false);
  });
});
