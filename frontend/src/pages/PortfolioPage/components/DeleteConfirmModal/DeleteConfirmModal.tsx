import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui';
import { fetchBuyTransactionsForTicker } from '../../../../api/portfolioApi';
import type { PortfolioTransaction } from '../../../../api/portfolioApi';
import styles from './DeleteConfirmModal.module.scss';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  ticker: string;
  onDeleteBuy: (transactionId: string) => Promise<void>;
  onDeleteAll: () => void;
  onSellInstead: () => void;
  onClose: () => void;
  isDeletingAll: boolean;
  buysRefreshKey: number;
}

function formatBuyDate(transaction: PortfolioTransaction): string {
  const fallback = transaction.createdAt.slice(0, 10);
  const raw = transaction.transactionDate ?? fallback;

  let normalized = fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    normalized = raw;
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      normalized = parsed.toISOString().slice(0, 10);
    }
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(value: number, currency: string): string {
  return `${currency === 'EUR' ? '€' : '$'}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DeleteConfirmModal({
  isOpen,
  ticker,
  onDeleteBuy,
  onDeleteAll,
  onSellInstead,
  onClose,
  isDeletingAll,
  buysRefreshKey,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <DeleteConfirmModalContent
      key={`${ticker}-${buysRefreshKey}`}
      ticker={ticker}
      onDeleteBuy={onDeleteBuy}
      onDeleteAll={onDeleteAll}
      onSellInstead={onSellInstead}
      onClose={onClose}
      isDeletingAll={isDeletingAll}
    />
  );
}

function DeleteConfirmModalContent({
  ticker,
  onDeleteBuy,
  onDeleteAll,
  onSellInstead,
  onClose,
  isDeletingAll,
}: Omit<DeleteConfirmModalProps, 'isOpen' | 'buysRefreshKey'>) {
  const [buys, setBuys] = useState<PortfolioTransaction[]>([]);
  const [isLoadingBuys, setIsLoadingBuys] = useState(true);
  const [deletingBuyId, setDeletingBuyId] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isDeletingAll && deletingBuyId === null) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeletingAll, deletingBuyId]);

  useEffect(() => {
    let cancelled = false;

    fetchBuyTransactionsForTicker(ticker)
      .then((items) => {
        if (!cancelled) setBuys(items);
      })
      .catch(() => {
        if (!cancelled) setBuys([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBuys(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  async function handleDeleteBuy(transactionId: string) {
    setDeletingBuyId(transactionId);
    try {
      await onDeleteBuy(transactionId);
      setBuys((prev) => {
        const next = prev.filter((buy) => buy.id !== transactionId);
        if (next.length === 0) {
          onClose();
        }
        return next;
      });
    } finally {
      setDeletingBuyId(null);
    }
  }

  const hasMultipleBuys = buys.length > 1;
  const isBusy = isDeletingAll || deletingBuyId !== null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && !isBusy && onClose()}
    >
      <div className={styles.modal} role="alertdialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Remove {ticker}</h2>
            <p className={styles.description}>
              {hasMultipleBuys
                ? 'Remove individual purchases or delete the entire position.'
                : 'This removes the position without recording a sale.'}
            </p>
          </div>
        </div>

        {isLoadingBuys ? (
          <div className={styles.loadingState}>
            <Loader2 size={18} className={styles.spinner} />
            <span>Loading purchases…</span>
          </div>
        ) : buys.length > 0 ? (
          <div className={styles.tableWrapper}>
            <p className={styles.tableLabel}>Purchase history</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className={styles.thNum}>Shares</th>
                  <th className={styles.thNum}>Price</th>
                  <th className={styles.thNum}>Total</th>
                  <th className={styles.thAction} />
                </tr>
              </thead>
              <tbody>
                {buys.map((buy) => {
                  const total = buy.shares * buy.pricePerShare;
                  const isDeletingThis = deletingBuyId === buy.id;

                  return (
                    <tr key={buy.id}>
                      <td className={styles.td}>{formatBuyDate(buy)}</td>
                      <td className={`${styles.td} ${styles.tdNum}`}>{buy.shares}</td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {formatMoney(buy.pricePerShare, buy.currency)}
                      </td>
                      <td className={`${styles.td} ${styles.tdNum}`}>
                        {formatMoney(total, buy.currency)}
                      </td>
                      <td className={styles.tdAction}>
                        <button
                          type="button"
                          className={styles.rowDeleteButton}
                          title="Remove this purchase"
                          disabled={isBusy}
                          onClick={() => void handleDeleteBuy(buy.id)}
                        >
                          {isDeletingThis ? (
                            <Loader2 size={14} className={styles.spinner} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className={styles.hint}>
          <span className={styles.hintEmoji}>💡</span>
          <span>
            Did you <strong>sell</strong> shares? Use{' '}
            <button
              type="button"
              className={styles.hintLink}
              onClick={onSellInstead}
              disabled={isBusy}
            >
              Close Position
            </button>{' '}
            instead — it records the sale in your history.
          </span>
        </div>

        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={isDeletingAll}
            onClick={onDeleteAll}
            disabled={isBusy && !isDeletingAll}
            className={styles.deleteButton}
          >
            {hasMultipleBuys ? 'Delete entire position' : 'Delete permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
}
