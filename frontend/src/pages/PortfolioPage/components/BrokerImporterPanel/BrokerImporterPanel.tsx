import { useRef, useState } from 'react';
import { Upload, CloudUpload, Loader } from 'lucide-react';
import { Button, ErrorBanner } from '../../../../components/ui';
import { ERROR_MESSAGES } from '../../../../constants';
import { getRejectedMessage } from '../../../../utils/apiError';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
} from '../../../../features/portfolio/portfolioSlice';
import { previewBrokerImport, confirmBrokerImport } from '../../../../api/importApi';
import type { ImportPreviewResponse } from '../../../../types/import.types';
import {
  ImportResultModal,
  type ImportResultModalType,
} from '../ImportResultModal/ImportResultModal';
import pageStyles from '../../PortfolioPage.module.scss';
import styles from './BrokerImporterPanel.module.scss';

const BROKER_OPTIONS = [
  { id: 'REVOLUT', label: 'Revolut', supported: true },
  { id: 'IB', label: 'Interactive Brokers', supported: false },
  { id: 'CS', label: 'Charles Schwab', supported: false },
  { id: 'FI', label: 'Fidelity', supported: false },
  { id: 'ET', label: 'eToro', supported: false },
  { id: 'T2', label: 'Trading 212', supported: false },
] as const;

const MAX_PREVIEW_ROWS = 25;

interface ImportResultModalState {
  type: ImportResultModalType;
  title: string;
  message: string;
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function BrokerImporterPanel() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedBroker, setSelectedBroker] = useState('REVOLUT');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResultModal, setImportResultModal] = useState<ImportResultModalState | null>(null);

  function resetState(): void {
    setPreview(null);
    setError(null);
  }

  function closeImportResultModal(): void {
    setImportResultModal(null);
  }

  function handleFileSelected(file: File): void {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx broker statements are supported');
      return;
    }

    setUploadedFile(file);
    resetState();
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(): void {
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelected(droppedFile);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelected(selectedFile);
    }
  }

  function handleBrowseClick(): void {
    fileInputRef.current?.click();
  }

  function handleClearFile(): void {
    setUploadedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handlePreview(): Promise<void> {
    if (!uploadedFile) return;

    setIsPreviewLoading(true);
    setError(null);

    try {
      const result = await previewBrokerImport(selectedBroker, uploadedFile);
      setPreview(result);
    } catch (previewError) {
      setError(getRejectedMessage(previewError, ERROR_MESSAGES.IMPORT_PREVIEW_FAILED));
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (!preview) return;

    setIsConfirmLoading(true);
    setError(null);

    try {
      const result = await confirmBrokerImport(preview.importId);

      await Promise.all([
        dispatch(fetchPortfolioSummaryThunk()),
        dispatch(fetchInvestmentSummaryThunk()),
        dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
        dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
      ]);

      setImportResultModal({
        type: 'success',
        title: 'Import complete',
        message:
          `Successfully imported ${result.importedCount} trade${result.importedCount === 1 ? '' : 's'}.` +
          (result.skippedDuplicateCount > 0
            ? ` ${result.skippedDuplicateCount} duplicate${result.skippedDuplicateCount === 1 ? '' : 's'} skipped.`
            : '') +
          ' Your portfolio has been updated.',
      });
      setPreview(null);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (confirmError) {
      setImportResultModal({
        type: 'error',
        title: 'Import failed',
        message: getRejectedMessage(confirmError, ERROR_MESSAGES.IMPORT_CONFIRM_FAILED),
      });
    } finally {
      setIsConfirmLoading(false);
    }
  }

  const previewTrades = preview?.trades.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const previewSkipped = preview?.skipped.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const importableCount = preview ? preview.summary.tradeCount - preview.summary.duplicateCount : 0;

  return (
    <div className={pageStyles.panelContent}>
      <div className={pageStyles.panelHeader}>
        <div className={pageStyles.panelHeaderIcon}>
          <Upload size={16} />
        </div>
        <div>
          <h2 className={pageStyles.panelTitle}>Broker Importer</h2>
          <p className={pageStyles.panelSubtitle}>
            Upload a Revolut account statement (.xlsx). We parse trades in memory and never store
            your file.
          </p>
        </div>
      </div>

      <div className={styles.brokerPicker}>
        <p className={styles.brokerPickerLabel}>Broker</p>
        <div className={pageStyles.brokersList}>
          {BROKER_OPTIONS.map((broker) => (
            <button
              key={broker.id}
              type="button"
              disabled={!broker.supported}
              className={`${pageStyles.brokerBadge} ${selectedBroker === broker.id ? styles.brokerBadgeActive : ''} ${!broker.supported ? styles.brokerBadgeDisabled : ''}`}
              onClick={() => {
                if (!broker.supported) return;
                setSelectedBroker(broker.id);
                resetState();
              }}
            >
              <span className={pageStyles.brokerName}>{broker.label}</span>
              {!broker.supported && <span className={styles.comingSoonTag}>Soon</span>}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`${pageStyles.dropZone} ${isDragging ? pageStyles.dropZoneActive : ''} ${uploadedFile ? pageStyles.dropZoneFilled : ''}`}
        onClick={() => {
          if (!uploadedFile) {
            handleBrowseClick();
          }
        }}
        onKeyDown={(event) => {
          if (uploadedFile) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleBrowseClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role={uploadedFile ? undefined : 'button'}
        tabIndex={uploadedFile ? -1 : 0}
        aria-label={uploadedFile ? undefined : 'Upload broker statement file'}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={pageStyles.fileInput}
          onChange={handleFileChange}
        />

        {uploadedFile ? (
          <div className={pageStyles.uploadedFile}>
            <div className={pageStyles.uploadedFileIcon}>
              <Upload size={24} />
            </div>
            <p className={pageStyles.uploadedFileName}>{uploadedFile.name}</p>
            <p className={pageStyles.uploadedFileSize}>
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </p>
            <div
              className={pageStyles.uploadedFileActions}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handlePreview()}
                disabled={isPreviewLoading}
                leftIcon={isPreviewLoading ? <Loader size={14} /> : undefined}
              >
                {isPreviewLoading ? 'Parsing…' : 'Preview Import'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearFile}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className={pageStyles.dropZoneContent}>
            <div className={pageStyles.dropZoneIcon}>
              <CloudUpload size={28} />
            </div>
            <p className={pageStyles.dropZoneText}>
              Drop your statement here, or{' '}
              <span className={pageStyles.browseLink}>browse files</span>
            </p>
            <p className={pageStyles.dropZoneHint}>Accepts: .xlsx only · Max 5 MB</p>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} className={styles.errorText} />}

      <ImportResultModal
        isOpen={importResultModal !== null}
        type={importResultModal?.type ?? 'success'}
        title={importResultModal?.title ?? ''}
        message={importResultModal?.message ?? ''}
        onClose={closeImportResultModal}
      />

      {preview && (
        <div className={styles.previewSection}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.tradeCount}</div>
              <div className={styles.summaryLabel}>Trades found</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.buyCount}</div>
              <div className={styles.summaryLabel}>Buys</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.sellCount}</div>
              <div className={styles.summaryLabel}>Sells</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.skippedCount}</div>
              <div className={styles.summaryLabel}>Skipped rows</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.duplicateCount}</div>
              <div className={styles.summaryLabel}>Duplicates</div>
            </div>
          </div>

          <div className={styles.previewBlock}>
            <h3 className={styles.previewTitle}>Trades to import</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ticker</th>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTrades.map((trade) => (
                    <tr key={`${trade.rowNumber}-${trade.sourceRowHash}`}>
                      <td className={styles.dateCell}>{trade.transactionDate}</td>
                      <td>{trade.ticker}</td>
                      <td
                        className={
                          trade.transactionType === 'BUY' ? styles.buyType : styles.sellType
                        }
                      >
                        {trade.transactionType}
                      </td>
                      <td className={styles.underlinedCell}>{trade.shares}</td>
                      <td className={styles.underlinedCell}>
                        {formatPrice(trade.pricePerShare, trade.currency)}
                      </td>
                      <td>{trade.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.trades.length > MAX_PREVIEW_ROWS && (
              <p className={pageStyles.dropZoneHint}>
                Showing first {MAX_PREVIEW_ROWS} of {preview.trades.length} trades
              </p>
            )}
          </div>

          {preview.skipped.length > 0 && (
            <div className={styles.previewBlock}>
              <h3 className={styles.previewTitle}>Skipped rows</h3>
              <div className={styles.tableWrapper}>
                <table className={`${styles.table} ${styles.skippedTable}`}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Type</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSkipped.map((row) => (
                      <tr key={`${row.rowNumber}-${row.sourceType}`}>
                        <td>{row.rowNumber}</td>
                        <td>{row.sourceType}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={styles.previewActions}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => void handleConfirmImport()}
              disabled={isConfirmLoading || importableCount === 0}
              leftIcon={isConfirmLoading ? <Loader size={16} /> : undefined}
            >
              {isConfirmLoading ? 'Importing…' : `Import ${importableCount} trades`}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={styles.cancelButton}
              onClick={() => setPreview(null)}
            >
              Cancel preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
