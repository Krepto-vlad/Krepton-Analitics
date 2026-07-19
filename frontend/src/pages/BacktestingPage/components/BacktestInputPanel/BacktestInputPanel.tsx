import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Loader, Plus, Search } from 'lucide-react';
import {
  BACKTEST_DEFAULT_AMOUNT,
  BACKTEST_MAX_AMOUNT,
  BACKTEST_MAX_TICKERS,
  BACKTEST_MIN_AMOUNT,
  BACKTEST_PERIODS,
  STOCK_SEARCH_DEBOUNCE_MS,
  STOCK_SEARCH_DROPDOWN_LIMIT,
  type BacktestPeriod,
  type Currency,
} from '../../../../constants';
import { fetchStockSearch } from '../../../../api/stockApi';
import type { StockSearchResult } from '../../../../types/stock.types';
import type { WatchlistItem } from '../../../../types/watchlist.types';
import { getCurrencySymbol } from '../../../../utils/moneyDisplay';
import {
  type BacktestAllocationTicker,
  getAllocationValidationStatus,
  getTotalAllocationWeight,
} from '../../utils/backtestAllocations';
import { AllocationSlider } from '../AllocationSlider/AllocationSlider';
import styles from './BacktestInputPanel.module.scss';

interface BacktestInputPanelProps {
  selectedTickers: BacktestAllocationTicker[];
  watchlistItems: WatchlistItem[];
  period: BacktestPeriod;
  amount: number;
  displayCurrency: Currency;
  isCalculating: boolean;
  canLoadFromPortfolio: boolean;
  onAddTicker: (ticker: Omit<BacktestAllocationTicker, 'weightPercent'>) => void;
  onRemoveTicker: (ticker: string) => void;
  onWeightChange: (ticker: string, weightPercent: number) => void;
  onLoadFromPortfolio: () => void;
  onPeriodChange: (period: BacktestPeriod) => void;
  onAmountChange: (amount: number) => void;
  onCalculate: () => void;
}

export function BacktestInputPanel({
  selectedTickers,
  watchlistItems,
  period,
  amount,
  displayCurrency,
  isCalculating,
  canLoadFromPortfolio,
  onAddTicker,
  onRemoveTicker,
  onWeightChange,
  onLoadFromPortfolio,
  onPeriodChange,
  onAmountChange,
  onCalculate,
}: BacktestInputPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAtMaxTickers = selectedTickers.length >= BACKTEST_MAX_TICKERS;
  const totalWeight = getTotalAllocationWeight(selectedTickers);
  const allocationStatus = getAllocationValidationStatus(totalWeight);
  const isAllocationValid = selectedTickers.length > 0 && allocationStatus === 'valid';
  const canCalculate = isAllocationValid && !isCalculating;

  const allocationHint =
    allocationStatus === 'under'
      ? `Increase allocations to reach 100% before calculating.`
      : allocationStatus === 'over'
        ? `Reduce allocations to 100% before calculating.`
        : null;

  const selectedTickerSet = useMemo(
    () => new Set(selectedTickers.map((item) => item.ticker)),
    [selectedTickers]
  );

  const watchlistSuggestions = useMemo(
    () => watchlistItems.filter((item) => !selectedTickerSet.has(item.ticker.toUpperCase())),
    [watchlistItems, selectedTickerSet]
  );

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  function resetSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const results = await fetchStockSearch(query.trim());
        setSearchResults(results.slice(0, STOCK_SEARCH_DROPDOWN_LIMIT));
        setIsDropdownOpen(results.length > 0);
      } catch {
        setSearchResults([]);
        setIsDropdownOpen(false);
      } finally {
        setIsSearchLoading(false);
      }
    }, STOCK_SEARCH_DEBOUNCE_MS);
  }

  function handleSelectResult(result: StockSearchResult) {
    if (isAtMaxTickers || selectedTickerSet.has(result.ticker.toUpperCase())) {
      return;
    }

    onAddTicker({ ticker: result.ticker.toUpperCase(), name: result.name });
    resetSearch();
  }

  function handleAddClick() {
    const firstResult = searchResults[0];
    if (firstResult) {
      handleSelectResult(firstResult);
    }
  }

  function handleAmountInputChange(rawValue: string) {
    const parsed = Number(rawValue.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(parsed)) {
      onAmountChange(BACKTEST_DEFAULT_AMOUNT);
      return;
    }
    onAmountChange(Math.min(BACKTEST_MAX_AMOUNT, Math.max(BACKTEST_MIN_AMOUNT, parsed)));
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <span className={styles.pageLabel}>What If Analysis</span>
          <h1 className={styles.pageTitle}>Light Backtesting</h1>
          <p className={styles.pageSubtitle}>
            Build a weighted portfolio and compare its historical performance against the S&amp;P
            500.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.loadPortfolioButton}
            onClick={onLoadFromPortfolio}
            disabled={!canLoadFromPortfolio}
          >
            <Briefcase size={14} />
            Load from portfolio
          </button>
          <span className={styles.maxHint}>Max {BACKTEST_MAX_TICKERS} tickers</span>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Portfolio</span>
          <div className={styles.tickerArea}>
            {selectedTickers.length > 0 && (
              <div className={styles.allocationsList}>
                {selectedTickers.map((item) => (
                  <AllocationSlider
                    key={item.ticker}
                    ticker={item.ticker}
                    weightPercent={item.weightPercent}
                    onWeightChange={(weightPercent) => onWeightChange(item.ticker, weightPercent)}
                    onRemove={() => onRemoveTicker(item.ticker)}
                  />
                ))}
                <div className={styles.allocationSummary}>
                  <div
                    className={`${styles.allocationTotal} ${
                      isAllocationValid
                        ? styles.allocationTotalValid
                        : styles.allocationTotalInvalid
                    }`}
                  >
                    Total allocation: {totalWeight.toFixed(1)}%
                  </div>
                  {allocationHint && <p className={styles.allocationHint}>{allocationHint}</p>}
                </div>
              </div>
            )}
            <div className={styles.searchRow}>
              <div className={styles.searchWrapper}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={isAtMaxTickers ? 'Maximum tickers reached' : 'Add ticker…'}
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
                  disabled={isAtMaxTickers}
                  autoComplete="off"
                />
                {isSearchLoading && <Loader size={14} className={styles.searchSpinner} />}

                {isDropdownOpen && searchResults.length > 0 && !isAtMaxTickers && (
                  <ul className={styles.dropdown}>
                    {searchResults.map((result) => (
                      <li key={result.ticker}>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => handleSelectResult(result)}
                        >
                          <span className={styles.dropdownTicker}>{result.ticker}</span>
                          <span className={styles.dropdownName}>{result.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className={styles.addButton}
                onClick={handleAddClick}
                disabled={isAtMaxTickers || searchResults.length === 0}
                aria-label="Add ticker"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Period</span>
          <div className={styles.periodButtons}>
            {BACKTEST_PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.periodButton} ${period === option.value ? styles.periodButtonActive : ''}`}
                onClick={() => onPeriodChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Amount</span>
          <div className={styles.amountWrapper}>
            <span className={styles.amountPrefix}>{getCurrencySymbol(displayCurrency)}</span>
            <input
              type="text"
              inputMode="numeric"
              className={styles.amountInput}
              value={amount}
              onChange={(event) => handleAmountInputChange(event.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className={styles.calculateButton}
          onClick={onCalculate}
          disabled={!canCalculate}
        >
          {isCalculating ? 'Calculating…' : 'Calculate'}
        </button>
      </div>

      {watchlistSuggestions.length > 0 && (
        <div className={styles.watchlistSection}>
          <span className={styles.watchlistLabel}>From watchlist:</span>
          {watchlistSuggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.suggestionButton}
              onClick={() =>
                onAddTicker({ ticker: item.ticker.toUpperCase(), name: item.companyName })
              }
              disabled={isAtMaxTickers}
            >
              <Plus size={10} />${item.ticker}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
