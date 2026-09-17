import { fetchLiveFxRates } from '../api/fxApi';
import {
  BEGINNER_TUTORIAL_SAMPLE_TICKER,
  DEFAULT_INTERVAL,
  DEFAULT_PERIOD,
  type Currency,
} from '../constants';
import {
  fetchTickerFundamentalsThunk,
  fetchTickerHistoryThunk,
  fetchTickerNewsThunk,
  fetchTickerQuoteThunk,
} from '../features/ticker/tickerSlice';
import type { AppDispatch } from '../store';
import { getTodayIsoDate } from './moneyDisplay';

const TUTORIAL_FX_SOURCE_CURRENCIES: Currency[] = ['USD', 'EUR'];

export function prefetchBeginnerTutorialTicker(
  dispatch: AppDispatch,
  displayCurrency: Currency
): void {
  const ticker = BEGINNER_TUTORIAL_SAMPLE_TICKER;

  void dispatch(fetchTickerQuoteThunk(ticker));
  void dispatch(fetchTickerFundamentalsThunk(ticker));
  void dispatch(fetchTickerNewsThunk(ticker));
  void dispatch(
    fetchTickerHistoryThunk({
      ticker,
      period: DEFAULT_PERIOD,
      interval: DEFAULT_INTERVAL,
    })
  );
  void fetchLiveFxRates(TUTORIAL_FX_SOURCE_CURRENCIES, displayCurrency, getTodayIsoDate());
}
