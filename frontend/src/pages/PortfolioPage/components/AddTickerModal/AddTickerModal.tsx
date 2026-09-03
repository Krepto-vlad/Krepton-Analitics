import { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Loader } from 'lucide-react';
import { Button, ErrorBanner, TickerAvatar } from '../../../../components/ui';
import { ERROR_MESSAGES } from '../../../../constants';
import { getRejectedMessage } from '../../../../utils/apiError';
import { fetchStockSearch } from '../../../../api/stockApi';
import type { StockSearchResult } from '../../../../types/stock.types';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { addWatchlistItemThunk } from '../../../../features/watchlist/watchlistSlice';
import styles from './AddTickerModal.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

interface AddTickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddTickerModalForm({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<StockSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setSelectedResult(null);
    setSubmitError(null);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const results = await fetchStockSearch(query.trim());
        setSearchResults(results.slice(0, 8));
        setIsDropdownOpen(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSelectResult(result: StockSearchResult) {
    setSelectedResult(result);
    setSearchQuery(`${result.ticker} — ${result.name}`);
    setSearchResults([]);
    setIsDropdownOpen(false);
    setSubmitError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedResult) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await dispatch(
        addWatchlistItemThunk({
          ticker: selectedResult.ticker,
          companyName: selectedResult.name,
        })
      ).unwrap();
      onClose();
    } catch (error) {
      setSubmitError(getRejectedMessage(error, ERROR_MESSAGES.WATCHLIST_ADD_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOverlayClick(event: React.MouseEvent) {
    if (event.target === overlayRef.current) onClose();
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Add ticker">
        <div className={styles.header}>
          <h2 className={styles.title}>Add Ticker</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Search ticker</label>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={`${styles.searchInput} ${selectedResult ? styles.searchInputSelected : ''}`}
                placeholder="Search ticker or company…"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
                autoComplete="off"
              />
              {isSearchLoading && <Loader size={14} className={styles.searchSpinner} />}
              {selectedResult && !isSearchLoading && (
                <Check size={14} className={styles.searchCheck} />
              )}

              {isDropdownOpen && searchResults.length > 0 && (
                <ul className={styles.dropdown}>
                  {searchResults.map((result) => (
                    <li key={result.ticker}>
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
          </div>

          {submitError && <ErrorBanner message={submitError} />}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              disabled={!selectedResult || isSubmitting}
            >
              Add to Watchlist
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddTickerModal({ isOpen, onClose }: AddTickerModalProps) {
  if (!isOpen) return null;
  return <AddTickerModalForm onClose={onClose} />;
}
