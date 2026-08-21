import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { fetchStockSearch } from '../../../api/stockApi';
import { TickerAvatar } from '../../ui';
import {
  HEADER_TICKER_SEARCH_INPUT_ID,
  HEADER_TICKER_SEARCH_INPUT_NAME,
  HEADER_TICKER_SEARCH_MAX_RESULTS,
  STOCK_SEARCH_DEBOUNCE_MS,
  TICKER_FORMAT_PATTERN,
  buildTickerDetailPath,
} from '../../../constants';
import type { StockSearchResult } from '../../../types/stock.types';
import styles from './HeaderTickerSearch.module.scss';

function normalizeTickerQuery(query: string): string {
  return query.trim().toUpperCase();
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
  }

  function handleSearchChange(query: string): void {
    setSearchQuery(query);

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
          const results = await fetchStockSearch(queryForRequest);
          if (requestId !== searchRequestIdRef.current) {
            return;
          }

          const limitedResults = results.slice(0, HEADER_TICKER_SEARCH_MAX_RESULTS);
          setSearchResults(limitedResults);
          setIsDropdownOpen(limitedResults.length > 0);
        } catch {
          if (requestId !== searchRequestIdRef.current) {
            return;
          }

          setSearchResults([]);
          setIsDropdownOpen(false);
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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    if (searchResults.length > 0) {
      openTickerPage(searchResults[0].ticker);
      return;
    }

    const normalizedTicker = normalizeTickerQuery(searchQuery);
    if (TICKER_FORMAT_PATTERN.test(normalizedTicker)) {
      openTickerPage(normalizedTicker);
    }
  }

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
            if (searchResults.length > 0) {
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
    </div>
  );
}
