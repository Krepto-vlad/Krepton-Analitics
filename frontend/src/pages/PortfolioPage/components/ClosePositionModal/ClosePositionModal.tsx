import { useState, useEffect, useId, useRef } from 'react';
import { Loader } from 'lucide-react';
import { Button, Select, ErrorBanner } from '../../../../components/ui';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';
import { closePositionThunk } from '../../../../features/portfolio/portfolioSlice';
import { fetchStockQuote } from '../../../../api/stockApi';
import type { PortfolioPosition } from '../../../../types/portfolio.types';
import { CURRENCY_OPTIONS, ERROR_MESSAGES } from '../../../../constants';
import { getRejectedMessage } from '../../../../utils/apiError';
import styles from './ClosePositionModal.module.scss';

// ─── Constants ───────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Component ────────────────────────────────────────────────────────────────

interface ClosePositionModalProps {
  isOpen: boolean;
  position: PortfolioPosition | null;
  onClose: () => void;
}

function ClosePositionModalForm({
  position,
  onClose,
}: {
  position: PortfolioPosition;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [sharesToSell, setSharesToSell] = useState(position.shares.toString());
  const [pricePerShare, setPricePerShare] = useState('');
  const [saleDate, setSaleDate] = useState(TODAY);
  const [currency, setCurrency] = useState<'USD' | 'EUR'>(
    (position.currency as 'USD' | 'EUR') ?? 'USD'
  );

  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockQuote(position.ticker)
      .then((quote) => {
        setPricePerShare(quote.price.toFixed(2));
        setCurrency(quote.currency === 'EUR' ? 'EUR' : 'USD');
      })
      .catch(() => {
        setPricePerShare(position.currentPrice.toFixed(2));
      })
      .finally(() => setIsPriceLoading(false));
  }, [position.ticker, position.currentPrice]);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: true,
    onEscape: onClose,
  });

  const parsedShares = parseFloat(sharesToSell);
  const parsedPrice = parseFloat(pricePerShare);
  const isFullClose = Math.abs(parsedShares - position.shares) < 0.000000001;

  const isFormValid =
    !isNaN(parsedShares) &&
    parsedShares > 0 &&
    parsedShares <= position.shares &&
    !isNaN(parsedPrice) &&
    parsedPrice > 0;

  const totalProceeds = isFormValid ? parsedShares * parsedPrice : 0;

  const pnlOnSale = isFormValid ? (parsedPrice - position.avgBuyPrice) * parsedShares : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid || !position) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await dispatch(
        closePositionThunk({
          positionId: position.id,
          payload: {
            shares: parsedShares,
            pricePerShare: parsedPrice,
            currency,
            saleDate: saleDate || undefined,
          },
        })
      ).unwrap();
      onClose();
    } catch (error) {
      setSubmitError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_POSITION_CLOSE_FAILED));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>
              Close Position
            </h2>
            <p className={styles.subtitle}>
              {position.ticker} · {position.companyName}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Current holding info */}
        <div className={styles.positionInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Held</span>
            <span className={styles.infoValue}>{position.shares} shares</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Avg cost</span>
            <span className={styles.infoValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: position.currency || 'USD',
              }).format(position.avgBuyPrice)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Current price</span>
            <span className={styles.infoValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: position.currency || 'USD',
              }).format(position.currentPrice)}
            </span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Shares row */}
          <div className={styles.field}>
            <label className={styles.label}>Shares to sell</label>
            <input
              type="number"
              className={styles.input}
              placeholder="0.00"
              min="0.00000001"
              max={position.shares}
              step="any"
              value={sharesToSell}
              onChange={(e) => setSharesToSell(e.target.value)}
            />
            {!isNaN(parsedShares) && parsedShares > position.shares && (
              <p className={styles.fieldError}>Cannot sell more than {position.shares} shares</p>
            )}
          </div>

          {/* Price + Date row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                Sale price per share
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

            <div className={styles.field}>
              <label className={styles.label}>Sale date</label>
              <input
                type="date"
                className={styles.input}
                value={saleDate}
                max={TODAY}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
          </div>

          {/* Currency */}
          <Select
            label="Currency"
            value={currency}
            onChange={setCurrency}
            options={CURRENCY_OPTIONS}
          />

          {/* P&L preview */}
          {isFormValid && (
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Sale proceeds</span>
                <span className={styles.summaryValue}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
                    totalProceeds
                  )}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Realized P&L</span>
                <span
                  className={`${styles.summaryValue} ${pnlOnSale >= 0 ? styles.positive : styles.negative}`}
                >
                  {pnlOnSale >= 0 ? '+' : ''}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
                    pnlOnSale
                  )}
                </span>
              </div>
              {isFullClose && (
                <p className={styles.fullCloseNote}>
                  This will fully close your {position.ticker} position.
                </p>
              )}
            </div>
          )}

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
              disabled={!isFormValid || isSubmitting}
            >
              Record Sale
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClosePositionModal({ isOpen, position, onClose }: ClosePositionModalProps) {
  if (!isOpen || !position) return null;
  return <ClosePositionModalForm key={position.id} position={position} onClose={onClose} />;
}
