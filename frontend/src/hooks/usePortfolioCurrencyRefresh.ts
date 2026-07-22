import { useEffect, useRef } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
  fetchPortfolioEquityHistoryThunk,
  fetchPortfolioRebalancingThunk,
} from '../features/portfolio/portfolioSlice';
import { clearLiveFxRateCache } from '../api/fxApi';

/**
 * Refetches portfolio datasets when the header display currency changes.
 * Skips the initial mount — live polling hooks already load portfolio data.
 */
export function usePortfolioCurrencyRefresh(): void {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((state) => state.ui.currency);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    clearLiveFxRateCache();

    void Promise.all([
      dispatch(fetchPortfolioSummaryThunk()),
      dispatch(fetchInvestmentSummaryThunk()),
      dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
      dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
      dispatch(fetchPortfolioEquityHistoryThunk()),
      dispatch(fetchPortfolioRebalancingThunk()),
    ]);
  }, [currency, dispatch]);
}
