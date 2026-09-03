import { clearStrategyDriftAlertDismissal } from '../../utils/strategyDriftAlertStorage';
import type { AppDispatch } from '../../store';
import { expireSession } from './authSlice';

export function expireClientSession(dispatch: AppDispatch): void {
  clearStrategyDriftAlertDismissal();
  dispatch(expireSession());
}
