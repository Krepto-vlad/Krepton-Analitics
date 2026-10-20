import { useCallback, useEffect, useState } from 'react';
import {
  ERROR_MESSAGES,
  STOCK_COMPARE_MAX_TICKERS,
  STOCK_COMPARE_MIN_TICKERS,
} from '../../constants';
import { fetchStockCompare } from '../../api/stockApi';
import { getRejectedMessage } from '../../utils/apiError';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchWatchlistThunk } from '../../features/watchlist/watchlistSlice';
import { ErrorBanner } from '../../components/ui';
import type { StockCompareItem } from '../../types/stock.types';
import { TickerPickerBar } from './components/TickerPickerBar/TickerPickerBar';
import { ComparisonMatrix } from './components/ComparisonMatrix/ComparisonMatrix';
import { MarketMoversPanel } from './components/MarketMoversPanel/MarketMoversPanel';
import { saveCompareChatScreen, saveMoversChatScreen } from '../../utils/tickerChatSession';
import type { SelectedCompareTicker } from './utils/compareMatrix';
import styles from './ScreenerPage.module.scss';

export function ScreenerPage() {
  const dispatch = useAppDispatch();
  const watchlistItems = useAppSelector((state) => state.watchlist.items);
  const hasHydratedWatchlist = useAppSelector((state) => state.watchlist.hasHydrated);
  const displayCurrency = useAppSelector((state) => state.ui.currency);

  const [selectedTickers, setSelectedTickers] = useState<SelectedCompareTicker[]>([]);
  const [compareItems, setCompareItems] = useState<StockCompareItem[]>([]);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const canAddTickers = selectedTickers.length < STOCK_COMPARE_MAX_TICKERS;

  useEffect(() => {
    if (selectedTickers.length >= STOCK_COMPARE_MIN_TICKERS) {
      return;
    }

    saveMoversChatScreen();
  }, [selectedTickers.length]);

  // Fetch exactly once per session using the hydration flag (not items.length): for
  // accounts with a genuinely empty watchlist, items.length stays 0 forever, which
  // previously caused this effect to refire and re-fetch in an infinite loop.
  useEffect(() => {
    if (!hasHydratedWatchlist) {
      dispatch(fetchWatchlistThunk());
    }
  }, [dispatch, hasHydratedWatchlist]);

  const refreshComparison = useCallback(async (tickers: SelectedCompareTicker[]) => {
    if (tickers.length < STOCK_COMPARE_MIN_TICKERS) {
      setCompareItems([]);
      setCompareError(null);
      return;
    }

    setIsCompareLoading(true);
    setCompareError(null);

    try {
      const response = await fetchStockCompare(tickers.map((item) => item.ticker));
      const itemOrder = new Map(tickers.map((item, index) => [item.ticker, index]));
      const sortedItems = [...response.items].sort(
        (left, right) => (itemOrder.get(left.ticker) ?? 0) - (itemOrder.get(right.ticker) ?? 0)
      );
      setCompareItems(sortedItems);
    } catch (error) {
      setCompareItems([]);
      setCompareError(getRejectedMessage(error, ERROR_MESSAGES.STOCK_COMPARE_FAILED));
    } finally {
      setIsCompareLoading(false);
    }
  }, []);

  function handleAddTicker(ticker: SelectedCompareTicker) {
    setSelectedTickers((current) => {
      if (current.some((item) => item.ticker === ticker.ticker)) {
        return current;
      }

      const nextTickers = [...current, ticker];
      void refreshComparison(nextTickers);
      saveCompareChatScreen(nextTickers);
      return nextTickers;
    });
  }

  function handleRemoveTicker(ticker: string) {
    setSelectedTickers((current) => {
      const nextTickers = current.filter((item) => item.ticker !== ticker);
      void refreshComparison(nextTickers);
      saveCompareChatScreen(nextTickers);
      return nextTickers;
    });
  }

  return (
    <div className={styles.page}>
      {compareError && (
        <div className={styles.errorBanner}>
          <ErrorBanner message={compareError} />
        </div>
      )}

      <MarketMoversPanel
        selectedTickers={selectedTickers}
        canAddTickers={canAddTickers}
        onAddTicker={handleAddTicker}
      />

      <TickerPickerBar
        selectedTickers={selectedTickers}
        watchlistItems={watchlistItems}
        onAddTicker={handleAddTicker}
        onRemoveTicker={handleRemoveTicker}
      />

      <ComparisonMatrix
        items={compareItems}
        isLoading={isCompareLoading}
        selectedCount={selectedTickers.length}
        minTickers={STOCK_COMPARE_MIN_TICKERS}
        displayCurrency={displayCurrency}
      />
    </div>
  );
}
