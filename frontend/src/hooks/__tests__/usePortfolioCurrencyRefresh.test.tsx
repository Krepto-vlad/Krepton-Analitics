import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { setCurrency } from '../../features/ui/uiSlice';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { usePortfolioCurrencyRefresh } from '../usePortfolioCurrencyRefresh';

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
  };
});

jest.mock('../../api/fxApi', () => ({
  clearLiveFxRateCache: jest.fn(),
}));

describe('usePortfolioCurrencyRefresh', () => {
  it('skips the first mount and refetches when currency changes', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => usePortfolioCurrencyRefresh(), { wrapper });
    expect(store.getState().ui.currency).toBe('USD');

    act(() => {
      store.dispatch(setCurrency('EUR'));
    });
    expect(store.getState().ui.currency).toBe('EUR');
  });
});
