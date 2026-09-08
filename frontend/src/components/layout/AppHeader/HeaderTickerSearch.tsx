import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { fetchStockSearch } from '../../../api/stockApi';
import { TickerAvatar } from '../../ui';
import {
  ERROR_MESSAGES,
  HEADER_TICKER_SEARCH_INPUT_ID,
  HEADER_TICKER_SEARCH_INPUT_NAME,
  HEADER_TICKER_SEARCH_MAX_RESULTS,
  STOCK_SEARCH_DEBOUNCE_MS,
  buildTickerDetailPath,
  formatTickerNotFoundMessage,
} from '../../../constants';
import type { StockSearchResult } from '../../../types/stock.types';
import styles from './HeaderTickerSearch.module.scss';

function normalizeTickerQuery(query: string): string {
  return query.trim().toUpperCase();
}

function pickSearchResult(
  results: StockSearchResult[],
  query: string
): StockSearchResult | undefined {
  const normalizedTicker = normalizeTickerQuery(query);
  const exactMatch = results.find((result) => result.ticker.toUpperCase() === normalizedTicker);
  if (exactMatch) {
    return exactMatch;
  }

  if (results.length === 1) {
    return results[0];
  }

  return undefined;
}

/**
 * Global header search: find a ticker and open its detail page.
 */
export function HeaderTickerSearch() {
  const navigate = useNavigate();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasResolvedSearch, setHasResolvedSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  function openTickerPage(ticker: string): void {
    navigate(buildTickerDetailPath(ticker));
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    setHasResolvedSearch(false);
    setSearchError(null);
  }

  async function searchTickers(query: string, requestId: number): Promise<StockSearchResult[]> {
    const results = await fetchStockSearch(query);
    if (requestId !== searchRequestIdRef.current) {
      return [];
    }

    const limitedResults = results.slice(0, HEADER_TICKER_SEARCH_MAX_RESULTS);
    setSearchResults(limitedResults);
    setHasResolvedSearch(true);
    setSearchError(null);
    setIsDropdownOpen(true);
    return limitedResults;
  }

  function handleSearchChange(query: string): void {
    setSearchQuery(query);
    setSearchError(null);
    setHasResolvedSearch(false);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (query.trim().length === 0) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setIsDropdownOpen(false);
      setIsSearchLoading(false);
      return;
    }

    const queryForRequest = query.trim();

    searchTimerRef.current = setTimeout(() => {
      void (async () => {
        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;
        setIsSearchLoading(true);

        try {
          await searchTickers(queryForRequest, requestId);
        } catch {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }

          setSearchResults([]);
          setHasResolvedSearch(true);
          setSearchError(ERROR_MESSAGES.STOCK_SEARCH_FAILED);
          setIsDropdownOpen(true);
        } finally {
          if (requestId === searchRequestIdRef.current) {
            setIsSearchLoading(false);
          }
        }
      })();
    }, STOCK_SEARCH_DEBOUNCE_MS);
  }

  function handleSelectResult(result: StockSearchResult): void {
    openTickerPage(result.ticker);
  }

  async function submitSearchQuery(): Promise<void> {
    const queryForRequest = searchQuery.trim();
    if (queryForRequest.length === 0) {
      return;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const matchedResult = pickSearchResult(searchResults, queryForRequest);
    if (matchedResult && hasResolvedSearch && !isSearchLoading) {
      openTickerPage(matchedResult.ticker);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setIsSearchLoading(true);
    setSearchError(null);

    try {
      const results = await searchTickers(queryForRequest, requestId);
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      const resultToOpen = pickSearchResult(results, queryForRequest);
      if (resultToOpen) {
        openTickerPage(resultToOpen.ticker);
      }
    } catch {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setSearchResults([]);
      setHasResolvedSearch(true);
      setSearchError(ERROR_MESSAGES.STOCK_SEARCH_FAILED);
      setIsDropdownOpen(true);
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearchLoading(false);
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void submitSearchQuery();
  }

  const emptyMessage = searchError ? searchError : formatTickerNotFoundMessage(searchQuery);
  const showEmptyState =
    isDropdownOpen && !isSearchLoading && hasResolvedSearch && searchResults.length === 0;

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} aria-hidden />
        <input
          id={HEADER_TICKER_SEARCH_INPUT_ID}
          name={HEADER_TICKER_SEARCH_INPUT_NAME}
          type="search"
          className={styles.searchInput}
          placeholder="Search ticker…"
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          onFocus={() => {
            if (searchResults.length > 0 || hasResolvedSearch || searchError) {
              setIsDropdownOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search ticker"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isDropdownOpen}
          role="combobox"
        />
        {isSearchLoading && <Loader2 size={14} className={styles.searchSpinner} aria-hidden />}
      </div>

      {isDropdownOpen && searchResults.length > 0 && (
        <ul id={listboxId} className={styles.dropdown} role="listbox">
          {searchResults.map((result) => (
            <li key={result.ticker} role="option">
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleSelectResult(result)}
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

      {showEmptyState && (
        <div id={listboxId} className={styles.emptyMessage} role="status" aria-live="polite">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
