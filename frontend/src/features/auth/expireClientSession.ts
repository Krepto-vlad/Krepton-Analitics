import { clearStrategyDriftAlertDismissal } from '../../utils/strategyDriftAlertStorage';
import { clearTickerChatSession } from '../../utils/tickerChatSession';
import type { AppDispatch } from '../../store';
import { expireSession } from './authSlice';

export function expireClientSession(dispatch: AppDispatch): void {
  clearStrategyDriftAlertDismissal();
  clearTickerChatSession();
  dispatch(expireSession());
}
