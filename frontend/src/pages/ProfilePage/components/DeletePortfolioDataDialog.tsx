import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { ERROR_MESSAGES, PORTFOLIO_DATA_DELETE_CONFIRMATION } from '../../../constants';
import { deletePortfolioData } from '../../../api/portfolioApi';
import {
  fetchInvestmentSummaryThunk,
  fetchPortfolioEquityHistoryThunk,
  fetchPortfolioNewsThunk,
  fetchPortfolioRebalancingThunk,
  fetchPortfolioSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
} from '../../../features/portfolio/portfolioSlice';
import { fetchWatchlistThunk } from '../../../features/watchlist/watchlistSlice';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { getRejectedMessage } from '../../../utils/apiError';
import { clearPersistedAlignmentExplanation } from '../../../utils/alignmentExplainStorage';
import { clearPersistedNewsBriefing } from '../../../utils/newsBriefingStorage';
import styles from '../ProfilePage.module.scss';
import { ProfileDialog } from './ProfileDialog';

interface DeletePortfolioDataDialogProps {
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeletePortfolioDataDialog({ onClose, onDeleted }: DeletePortfolioDataDialogProps) {
  const dispatch = useAppDispatch();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete = deleteConfirmText.trim().toUpperCase() === PORTFOLIO_DATA_DELETE_CONFIRMATION;

  async function handleDeletePortfolioData(): Promise<void> {
    if (!canDelete) {
      return;
    }

    setIsDeletingData(true);
    setDeleteError(null);

    try {
      const result = await deletePortfolioData(PORTFOLIO_DATA_DELETE_CONFIRMATION);
      clearPersistedNewsBriefing();
      clearPersistedAlignmentExplanation();

      await Promise.all([
        dispatch(fetchPortfolioSummaryThunk()),
        dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
        dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
        dispatch(fetchInvestmentSummaryThunk()),
        dispatch(fetchPortfolioEquityHistoryThunk()),
        dispatch(fetchWatchlistThunk()),
        dispatch(fetchPortfolioNewsThunk()),
        dispatch(fetchPortfolioRebalancingThunk()),
      ]);

      onDeleted(
        `Deleted ${result.deletedPositions} positions, ${result.deletedTransactions} transactions, and ${result.deletedWatchlistItems} watchlist items.`
      );
    } catch (error) {
      setDeleteError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_DELETE_DATA_FAILED));
      setIsDeletingData(false);
    }
  }

  return (
    <ProfileDialog titleId="delete-data-title" onClose={onClose} disableClose={isDeletingData}>
      <h3 id="delete-data-title" className={styles.modalTitle}>
        Delete portfolio data
      </h3>
      <p className={styles.securityHint}>
        Type <strong>{PORTFOLIO_DATA_DELETE_CONFIRMATION}</strong> to confirm permanent deletion of
        holdings, transactions and watchlist.
      </p>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Confirmation</span>
        <input
          className={styles.fieldInput}
          value={deleteConfirmText}
          onChange={(event) => setDeleteConfirmText(event.target.value)}
          placeholder={PORTFOLIO_DATA_DELETE_CONFIRMATION}
          disabled={isDeletingData}
        />
      </label>

      {deleteError && <p className={styles.errorMessage}>{deleteError}</p>}

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
          disabled={isDeletingData}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={() => void handleDeletePortfolioData()}
          disabled={!canDelete || isDeletingData}
        >
          {isDeletingData ? (
            <>
              <Loader2 size={14} className={styles.spinner} />
              Deleting…
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Delete forever
            </>
          )}
        </button>
      </div>
    </ProfileDialog>
  );
}
