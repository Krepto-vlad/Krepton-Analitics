import { STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY } from '../constants';

export function isStrategyDriftAlertDismissed(strategyId: string): boolean {
  try {
    return sessionStorage.getItem(STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY) === strategyId;
  } catch {
    return false;
  }
}

export function dismissStrategyDriftAlert(strategyId: string): void {
  try {
    sessionStorage.setItem(STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY, strategyId);
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function clearStrategyDriftAlertDismissal(): void {
  try {
    sessionStorage.removeItem(STRATEGY_DRIFT_ALERT_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}
