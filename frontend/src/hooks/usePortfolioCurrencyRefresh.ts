import { useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
  fetchPortfolioEquityHistoryThunk,
} from '../features/portfolio/portfolioSlice';
import { clearLiveFxRateCache } from '../api/fxApi';

/**
 * Refetches portfolio datasets whenever the header display currency changes.
 */
export function usePortfolioCurrencyRefresh(): void {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((state) => state.ui.currency);

  useEffect(() => {
    clearLiveFxRateCache();

    void Promise.all([
      dispatch(fetchPortfolioSummaryThunk()),
      dispatch(fetchInvestmentSummaryThunk()),
      dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
      dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
      dispatch(fetchPortfolioEquityHistoryThunk()),
    ]);
  }, [currency, dispatch]);
}
