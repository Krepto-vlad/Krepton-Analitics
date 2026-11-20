import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BACKTEST_ALLOCATION_TOLERANCE,
  BACKTEST_ALLOCATION_TOTAL_PERCENT,
  BACKTEST_DEFAULT_AMOUNT,
  BACKTEST_MAX_TICKERS,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  TICKER_CHAT_SCREEN_BACKTEST_KIND,
  type BacktestPeriod,
} from '../../constants';
import {
  loadChatScreenContext,
  saveBacktestChatScreen,
  saveChatScreenContext,
} from '../../utils/tickerChatSession';
import { fetchStockBacktest } from '../../api/stockApi';
import { getRejectedMessage } from '../../utils/apiError';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchWatchlistThunk } from '../../features/watchlist/watchlistSlice';
import { fetchPortfolioSummaryThunk } from '../../features/portfolio/portfolioSlice';
import { isIncludedInPortfolioAnalysis } from '../../utils/portfolioAnalysisScope';
import { ContentSkeleton, ErrorBanner } from '../../components/ui';
import type { StockBacktestResponse } from '../../types/stock.types';
import { BacktestInputPanel } from './components/BacktestInputPanel/BacktestInputPanel';
import { BacktestResults } from './components/BacktestResults/BacktestResults';
import {
  type BacktestAllocationTicker,
  buildAllocationsFromPortfolioPositions,
  getTotalAllocationWeight,
  normalizeAllocationWeights,
  rebalanceEqualWeights,
  adjustAllocationWeight,
} from './utils/backtestAllocations';
import styles from './BacktestingPage.module.scss';

export function BacktestingPage() {
  const dispatch = useAppDispatch();
  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const hasHydratedWatchlist = useAppSelector((state) => state.watchlist.hasHydrated);
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const analyzedPositions = useMemo(
    () => summaryPositions.filter(isIncludedInPortfolioAnalysis),
    [summaryPositions]
  );
  const hasHydratedSummary = useAppSelector((state) => state.portfolio.hasHydratedSummary);
  const displayCurrency = useAppSelector((state) => state.ui.currency);

  const [selectedTickers, setSelectedTickers] = useState<BacktestAllocationTicker[]>([]);
  const [period, setPeriod] = useState<BacktestPeriod>('3y');
  const [amount, setAmount] = useState(BACKTEST_DEFAULT_AMOUNT);
  const [backtestData, setBacktestData] = useState<StockBacktestResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch exactly once per session using the hydration flags (not items.length): for
  // accounts with a genuinely empty watchlist/portfolio, length stays 0 forever, which
  // previously caused these effects to refire and re-fetch in an infinite loop.
  useEffect(() => {
    if (!hasHydratedWatchlist) {
      dispatch(fetchWatchlistThunk());
    }
  }, [dispatch, hasHydratedWatchlist]);

  useEffect(() => {
    if (!hasHydratedSummary) {
      dispatch(fetchPortfolioSummaryThunk());
    }
  }, [dispatch, hasHydratedSummary]);

  const runBacktest = useCallback(async () => {
    if (selectedTickers.length === 0) {
      return;
    }

    const normalizedAllocations = normalizeAllocationWeights(selectedTickers);
    const totalWeight = getTotalAllocationWeight(normalizedAllocations);
    if (Math.abs(totalWeight - BACKTEST_ALLOCATION_TOTAL_PERCENT) > BACKTEST_ALLOCATION_TOLERANCE) {
      setError('Allocation weights must sum to 100%.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetchStockBacktest({
        allocations: normalizedAllocations.map((item) => ({
          ticker: item.ticker,
          weightPercent: item.weightPercent,
        })),
        period,
        amount,
        displayCurrency,
      });
      setBacktestData(response);
      setSelectedTickers(normalizedAllocations);
      saveBacktestChatScreen({
        kind: TICKER_CHAT_SCREEN_BACKTEST_KIND,
        period,
        amount,
        displayCurrency,
        allocations: normalizedAllocations.map((item) => ({
          ticker: item.ticker,
          name: item.name,
          weightPercent: item.weightPercent,
        })),
      });
    } catch (calculateError) {
      setBacktestData(null);
      if (loadChatScreenContext()?.kind === TICKER_CHAT_SCREEN_BACKTEST_KIND) {
        saveChatScreenContext(null);
      }
      setError(getRejectedMessage(calculateError, ERROR_MESSAGES.STOCK_BACKTEST_FAILED));
    } finally {
      setIsCalculating(false);
    }
  }, [amount, displayCurrency, period, selectedTickers]);

  function handleAddTicker(ticker: { ticker: string; name: string }) {
    setSelectedTickers((current) => {
      if (current.some((item) => item.ticker === ticker.ticker)) {
        return current;
      }

      return rebalanceEqualWeights([...current, { ...ticker, weightPercent: 0 }]);
    });
  }

  function handleRemoveTicker(ticker: string) {
    const remainingTickers = rebalanceEqualWeights(
      selectedTickers.filter((item) => item.ticker !== ticker)
    );
    setSelectedTickers(remainingTickers);
    if (remainingTickers.length > 0) {
      return;
    }

    setBacktestData(null);
    if (loadChatScreenContext()?.kind === TICKER_CHAT_SCREEN_BACKTEST_KIND) {
      saveChatScreenContext(null);
    }
  }

  function handleWeightChange(ticker: string, weightPercent: number) {
    setSelectedTickers((current) => adjustAllocationWeight(current, ticker, weightPercent));
  }

  function handleLoadFromPortfolio() {
    const allocations = buildAllocationsFromPortfolioPositions(
      analyzedPositions.map((position) => ({
        ticker: position.ticker,
        companyName: position.companyName,
        shares: position.shares,
        currentPrice: position.currentPrice,
      })),
      BACKTEST_MAX_TICKERS
    );

    if (allocations.length === 0) {
      setError('Add positions to your portfolio first.');
      return;
    }

    setSelectedTickers(allocations);
    setBacktestData(null);
    setError(null);
  }

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.errorBanner}>
          <ErrorBanner message={error} />
        </div>
      )}

      <BacktestInputPanel
        selectedTickers={selectedTickers}
        watchlistItems={watchlistItems}
        period={period}
        amount={amount}
        displayCurrency={displayCurrency}
        isCalculating={isCalculating}
        canLoadFromPortfolio={analyzedPositions.length > 0}
        onAddTicker={handleAddTicker}
        onRemoveTicker={handleRemoveTicker}
        onWeightChange={handleWeightChange}
        onLoadFromPortfolio={handleLoadFromPortfolio}
        onPeriodChange={setPeriod}
        onAmountChange={setAmount}
        onCalculate={() => {
          void runBacktest();
        }}
      />

      {isCalculating && !backtestData && (
        <ContentSkeleton preset="page" label={LOADING_MESSAGES.BACKTEST_CALCULATION} />
      )}

      {backtestData ? (
        <BacktestResults data={backtestData} displayCurrency={displayCurrency} />
      ) : (
        !isCalculating && (
          <div className={styles.emptyCard}>
            Build a weighted portfolio, set period and amount, then click Calculate. You can also
            load allocations directly from your current holdings.
          </div>
        )
      )}
    </div>
  );
}
