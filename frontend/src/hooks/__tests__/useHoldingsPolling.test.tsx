import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { activateLivePollingScope } from '../../features/livePolling/livePollingSlice';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useHoldingsPolling } from '../useHoldingsPolling';

jest.mock('../../utils/tabLeader', () => ({
  useTabLeader: () => true,
}));

jest.mock('../../features/portfolio/portfolioSlice', () => {
  const actual = jest.requireActual('../../features/portfolio/portfolioSlice');
  return {
    ...actual,
    fetchPortfolioSummaryThunk: () => ({ type: 'portfolio/summary' }),
    fetchInvestmentSummaryThunk: () => ({ type: 'portfolio/investment' }),
    fetchPositionsPageThunk: () => ({ type: 'portfolio/positions' }),
    fetchTransactionsPageThunk: () => ({ type: 'portfolio/tx' }),
    fetchPortfolioEquityHistoryThunk: () => ({ type: 'portfolio/equity' }),
    fetchPortfolioRebalancingThunk: () => ({ type: 'portfolio/rebal' }),
    refreshHoldingsQuotesThunk: () => ({ type: 'portfolio/refreshQuotes' }),
  };
});

describe('useHoldingsPolling', () => {
  it('hydrates holdings when the live scope is active', () => {
    const store = createTestStore();
    store.dispatch(activateLivePollingScope('holdings'));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { unmount } = renderHook(() => useHoldingsPolling(), { wrapper });
    act(() => undefined);
    unmount();
  });
});
