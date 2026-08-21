import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X, Loader } from 'lucide-react';
import {
  STOCK_COMPARE_MAX_TICKERS,
  STOCK_SEARCH_DEBOUNCE_MS,
  STOCK_SEARCH_DROPDOWN_LIMIT,
} from '../../../../constants';
import { fetchStockSearch } from '../../../../api/stockApi';
import type { StockSearchResult } from '../../../../types/stock.types';
import type { WatchlistItem } from '../../../../types/watchlist.types';
import { TickerAvatar } from '../../../../components/ui';
import type { SelectedCompareTicker } from '../../utils/compareMatrix';
import styles from './TickerPickerBar.module.scss';

interface TickerPickerBarProps {
  selectedTickers: SelectedCompareTicker[];
  watchlistItems: WatchlistItem[];
  onAddTicker: (ticker: SelectedCompareTicker) => void;
  onRemoveTicker: (ticker: string) => void;
}

export function TickerPickerBar({
  selectedTickers,
  watchlistItems,
  onAddTicker,
  onRemoveTicker,
}: TickerPickerBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<StockSearchResult | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtMaxTickers = selectedTickers.length >= STOCK_COMPARE_MAX_TICKERS;

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
    setSelectedResult(null);
    setIsDropdownOpen(false);
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setSelectedResult(null);

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

  function handleAddSelectedResult() {
    if (isAtMaxTickers) {
      return;
    }

    if (selectedResult) {
      handleSelectResult(selectedResult);
      return;
    }

    const firstResult = searchResults[0];
    if (firstResult) {
      handleSelectResult(firstResult);
    }
  }

  function handleSuggestionClick(item: WatchlistItem) {
    if (isAtMaxTickers) {
      return;
    }

    onAddTicker({
      ticker: item.ticker.toUpperCase(),
      name: item.companyName,
    });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (selectedResult) {
        handleAddSelectedResult();
        return;
      }

      const firstResult = searchResults[0];
      if (firstResult) {
        handleSelectResult(firstResult);
      }
    }
  }

  return (
    <section className={styles.bar}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <span className={styles.pageLabel}>Stock Matrix</span>
          <h2 className={styles.pageTitle}>Stock Comparison Matrix</h2>
          <p className={styles.pageSubtitle}>
            Side-by-side fundamental analysis with automatic winner highlighting
          </p>
        </div>
        <span className={styles.maxHint}>Max {STOCK_COMPARE_MAX_TICKERS} tickers</span>
      </div>

      <div className={styles.pickerSection}>
        {selectedTickers.length > 0 && (
          <div className={styles.chipsRow}>
            {selectedTickers.map((item) => (
              <span key={item.ticker} className={styles.tickerChip}>
                <TickerAvatar ticker={item.ticker} size="xs" />${item.ticker}
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={() => onRemoveTicker(item.ticker)}
                  aria-label={`Remove ${item.ticker}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.searchRow}>
          <div className={styles.addRow}>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={isAtMaxTickers ? 'Maximum tickers reached' : 'Add ticker…'}
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
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
                        disabled={selectedTickerSet.has(result.ticker.toUpperCase())}
                      >
                        <span className={styles.dropdownTickerCell}>
                          <TickerAvatar ticker={result.ticker} size="xs" />
                          <span className={styles.dropdownTicker}>{result.ticker}</span>
                        </span>
                        <span className={styles.dropdownName}>{result.name}</span>
                        <span className={styles.dropdownExchange}>{result.exchange}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddSelectedResult}
              disabled={isAtMaxTickers || (searchResults.length === 0 && !selectedResult)}
              aria-label="Add selected ticker"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {watchlistSuggestions.length > 0 && (
        <div className={styles.watchlistSection}>
          <span className={styles.watchlistLabel}>From your watchlist</span>
          <div className={styles.watchlistSuggestions}>
            {watchlistSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.suggestionButton}
                onClick={() => handleSuggestionClick(item)}
                disabled={isAtMaxTickers}
              >
                <Plus size={12} />${item.ticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
