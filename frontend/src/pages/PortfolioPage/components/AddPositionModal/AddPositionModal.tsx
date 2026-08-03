import { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Loader } from 'lucide-react';
import { Button, Select, DatePicker, ErrorBanner, TickerAvatar } from '../../../../components/ui';
import { ERROR_MESSAGES } from '../../../../constants';
import { getRejectedMessage } from '../../../../utils/apiError';
import { toIsoDate } from '../../../../components/ui/DatePicker/datePickerUtils';
import { fetchStockSearch, fetchStockQuote } from '../../../../api/stockApi';
import type { StockSearchResult } from '../../../../types/stock.types';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { addPositionThunk } from '../../../../features/portfolio/portfolioSlice';
import { CURRENCY_OPTIONS } from '../../../../constants';
import styles from './AddPositionModal.module.scss';

// ─── Constants ───────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 350;
const TODAY = toIsoDate(new Date());

// ─── Component ────────────────────────────────────────────────────────────────

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddPositionModalForm({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<StockSearchResult | null>(null);

  const [shares, setShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [entryDate, setEntryDate] = useState(TODAY);
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');

  const [isPriceLoading, setIsPriceLoading] = useState(false);
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
    setPricePerShare('');

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

  async function handleSelectResult(result: StockSearchResult) {
    setSelectedResult(result);
    setSearchQuery(`${result.ticker} — ${result.name}`);
    setSearchResults([]);
    setIsDropdownOpen(false);

    setIsPriceLoading(true);
    try {
      const quote = await fetchStockQuote(result.ticker);
      setPricePerShare(quote.price.toFixed(2));
      setCurrency(quote.currency === 'EUR' ? 'EUR' : 'USD');
    } catch {
      // Leave price empty for manual input
    } finally {
      setIsPriceLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedResult) return;

    const parsedShares = parseFloat(shares);
    const parsedPrice = parseFloat(pricePerShare);

    if (isNaN(parsedShares) || parsedShares <= 0) {
      setSubmitError('Shares must be a positive number');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setSubmitError('Price per share must be a positive number');
      return;
    }
    if (!entryDate) {
      setSubmitError('Purchase date is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await dispatch(
        addPositionThunk({
          ticker: selectedResult.ticker,
          companyName: selectedResult.name,
          shares: parsedShares,
          avgBuyPrice: parsedPrice,
          currency,
          entryDate: entryDate || undefined,
        })
      ).unwrap();
      onClose();
    } catch (error) {
      setSubmitError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_POSITION_ADD_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOverlayClick(event: React.MouseEvent) {
    if (event.target === overlayRef.current) onClose();
  }

  const isFormValid =
    selectedResult !== null &&
    shares.trim() !== '' &&
    pricePerShare.trim() !== '' &&
    entryDate.trim() !== '' &&
    !isNaN(parseFloat(shares)) &&
    !isNaN(parseFloat(pricePerShare));

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Add position">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add Position</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Ticker search */}
          <div className={styles.field}>
            <label className={styles.label}>Ticker</label>
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className={`${styles.searchInput} ${selectedResult ? styles.searchInputSelected : ''}`}
                placeholder="Search ticker or company…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
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

          {/* Shares + Price row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Shares</label>
              <input
                type="number"
                className={styles.input}
                placeholder="0.00"
                min="0.00000001"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Price per share
                {isPriceLoading && <Loader size={11} className={styles.inlineSpinner} />}
              </label>
              <input
                type="number"
                className={styles.input}
                placeholder="0.00"
                min="0.00000001"
                step="any"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
              />
            </div>
          </div>

          {/* Date + Currency row */}
          <div className={styles.row}>
            <DatePicker
              label="Purchase date"
              value={entryDate}
              max={TODAY}
              onChange={setEntryDate}
            />

            <Select
              label="Currency"
              value={currency}
              onChange={setCurrency}
              options={CURRENCY_OPTIONS}
            />
          </div>

          {/* Total cost preview */}
          {isFormValid && (
            <div className={styles.totalPreview}>
              <span className={styles.totalLabel}>Total cost</span>
              <span className={styles.totalValue}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                  minimumFractionDigits: 2,
                }).format(parseFloat(shares) * parseFloat(pricePerShare))}
              </span>
            </div>
          )}

          {submitError && <ErrorBanner message={submitError} />}

          {/* Actions */}
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
              disabled={!isFormValid || isSubmitting}
            >
              Add to Portfolio
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddPositionModal({ isOpen, onClose }: AddPositionModalProps) {
  if (!isOpen) return null;
  return <AddPositionModalForm onClose={onClose} />;
}
