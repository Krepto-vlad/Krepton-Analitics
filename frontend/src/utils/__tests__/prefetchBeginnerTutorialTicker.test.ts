import { fetchLiveFxRates } from '../../api/fxApi';
import { BEGINNER_TUTORIAL_SAMPLE_TICKER, DEFAULT_INTERVAL, DEFAULT_PERIOD } from '../../constants';
import {
  fetchTickerFundamentalsThunk,
  fetchTickerHistoryThunk,
  fetchTickerNewsThunk,
  fetchTickerQuoteThunk,
} from '../../features/ticker/tickerSlice';
import { prefetchBeginnerTutorialTicker } from '../prefetchBeginnerTutorialTicker';
import type { AppDispatch } from '../../store';

jest.mock('../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn().mockResolvedValue({ USD: 1, EUR: 1 }),
}));

jest.mock('../../features/ticker/tickerSlice', () => ({
  fetchTickerQuoteThunk: jest.fn((ticker: string) => ({ type: 'quote', ticker })),
  fetchTickerFundamentalsThunk: jest.fn((ticker: string) => ({ type: 'fundamentals', ticker })),
  fetchTickerNewsThunk: jest.fn((ticker: string) => ({ type: 'news', ticker })),
  fetchTickerHistoryThunk: jest.fn((params: { ticker: string }) => ({
    type: 'history',
    ...params,
  })),
}));

describe('prefetchBeginnerTutorialTicker', () => {
  it('dispatches sample-ticker quote, history, fundamentals, and news', () => {
    const dispatch = jest.fn() as unknown as AppDispatch;

    prefetchBeginnerTutorialTicker(dispatch, 'USD');

    expect(fetchTickerQuoteThunk).toHaveBeenCalledWith(BEGINNER_TUTORIAL_SAMPLE_TICKER);
    expect(fetchTickerFundamentalsThunk).toHaveBeenCalledWith(BEGINNER_TUTORIAL_SAMPLE_TICKER);
    expect(fetchTickerNewsThunk).toHaveBeenCalledWith(BEGINNER_TUTORIAL_SAMPLE_TICKER);
    expect(fetchTickerHistoryThunk).toHaveBeenCalledWith({
      ticker: BEGINNER_TUTORIAL_SAMPLE_TICKER,
      period: DEFAULT_PERIOD,
      interval: DEFAULT_INTERVAL,
    });
    expect(fetchLiveFxRates).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(4);
  });
});
