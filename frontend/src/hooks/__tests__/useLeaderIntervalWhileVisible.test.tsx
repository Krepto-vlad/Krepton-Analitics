import { act, renderHook } from '@testing-library/react';
import { useLeaderIntervalWhileVisible } from '../useLeaderIntervalWhileVisible';

describe('useLeaderIntervalWhileVisible', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ticks on an interval while the leader tab is visible', () => {
    const onTick = jest.fn();
    renderHook(() =>
      useLeaderIntervalWhileVisible({
        isLeader: true,
        isActive: true,
        intervalMs: 1000,
        onTick,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('does not tick when inactive', () => {
    const onTick = jest.fn();
    renderHook(() =>
      useLeaderIntervalWhileVisible({
        isLeader: false,
        isActive: true,
        intervalMs: 1000,
        onTick,
      })
    );
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onTick).not.toHaveBeenCalled();
  });
});
