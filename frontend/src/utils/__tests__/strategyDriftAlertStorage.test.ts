import { STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY } from '../../constants';
import {
  clearStrategyDriftAlertDismissal,
  dismissStrategyDriftAlert,
  isStrategyDriftAlertDismissed,
} from '../strategyDriftAlertStorage';

describe('strategyDriftAlertStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and clears a dismissed strategy id', () => {
    expect(isStrategyDriftAlertDismissed('core-60-40')).toBe(false);
    dismissStrategyDriftAlert('core-60-40');
    expect(isStrategyDriftAlertDismissed('core-60-40')).toBe(true);
    expect(sessionStorage.getItem(STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY)).toBe('core-60-40');
    clearStrategyDriftAlertDismissal();
    expect(isStrategyDriftAlertDismissed('core-60-40')).toBe(false);
  });
});
