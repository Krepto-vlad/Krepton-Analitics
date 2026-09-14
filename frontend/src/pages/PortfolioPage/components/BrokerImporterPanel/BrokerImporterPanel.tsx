import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, CloudUpload, Loader, Link2 } from 'lucide-react';
import { Button, ErrorBanner, Select } from '../../../../components/ui';
import { BrokerConnectionsList } from '../../../../components/broker/BrokerConnectionsList';
import {
  BROKER_SYNC_CONNECTED,
  BROKER_SYNC_RETURN_QUERY,
  ERROR_MESSAGES,
  ROUTES,
  SNAPTRADE_CONNECTABLE_BROKERS,
  type SnaptradeConnectableBrokerId,
} from '../../../../constants';
import { getRejectedMessage } from '../../../../utils/apiError';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import {
  fetchPortfolioSummaryThunk,
  fetchInvestmentSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
} from '../../../../features/portfolio/portfolioSlice';
import { previewBrokerImport, confirmBrokerImport } from '../../../../api/importApi';
import {
  confirmBrokerSync,
  connectBrokerSync,
  previewBrokerSync,
} from '../../../../api/brokerSyncApi';
import type { BrokerParserMode, ImportPreviewResponse } from '../../../../types/import.types';
import {
  ImportResultModal,
  type ImportResultModalType,
} from '../ImportResultModal/ImportResultModal';
import pageStyles from '../../PortfolioPage.module.scss';
import styles from './BrokerImporterPanel.module.scss';

const PARSER_MODE_LABELS: Record<BrokerParserMode, string> = {
  heuristic: 'Auto-detected',
  ai_schema: 'AI-assisted',
  broker_sync: 'Broker snapshot',
};

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

function isSupportedStatementFile(fileName: string): boolean {
  const normalized = fileName.toLowerCase();
  return normalized.endsWith('.xlsx') || normalized.endsWith('.csv');
}

export function BrokerImporterPanel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPaid = useAppSelector((state) => Boolean(state.auth.user?.subscription?.isPaid));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didAutoPreviewRef = useRef(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<SnaptradeConnectableBrokerId>(
    SNAPTRADE_CONNECTABLE_BROKERS[0].id
  );
  const [isConnectingBroker, setIsConnectingBroker] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [importResultModal, setImportResultModal] = useState<ImportResultModalState | null>(null);

  function closeImportResultModal(): void {
    setImportResultModal(null);
  }

  function handleFileSelected(file: File): void {
    if (!isSupportedStatementFile(file.name)) {
      setFileError('Only .xlsx and .csv statements are supported (PDF is not supported)');
      return;
    }

    setUploadedFile(file);
    setPreview(null);
    setFileError(null);
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
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handlePreview(): Promise<void> {
    if (!uploadedFile) return;

    setIsPreviewLoading(true);
    setFileError(null);

    try {
      const result = await previewBrokerImport(uploadedFile);
      setPreview(result);
    } catch (previewError) {
      setFileError(getRejectedMessage(previewError, ERROR_MESSAGES.IMPORT_PREVIEW_FAILED));
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleConnectBroker(broker: SnaptradeConnectableBrokerId): Promise<void> {
    if (!isPaid) {
      navigate(ROUTES.SUBSCRIPTION);
      return;
    }

    setIsConnectingBroker(true);
    setConnectError(null);

    try {
      const result = await connectBrokerSync(broker);
      window.open(result.redirectUrl, '_self');
    } catch (connectFailure) {
      setConnectError(
        getRejectedMessage(connectFailure, ERROR_MESSAGES.BROKER_SYNC_CONNECT_FAILED)
      );
      setIsConnectingBroker(false);
    }
  }

  useEffect(() => {
    if (didAutoPreviewRef.current) {
      return;
    }

    if (searchParams.get(BROKER_SYNC_RETURN_QUERY) !== BROKER_SYNC_CONNECTED) {
      return;
    }

    didAutoPreviewRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(BROKER_SYNC_RETURN_QUERY);

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setSearchParams(nextParams, { replace: true });
      setIsPreviewLoading(true);
      setConnectError(null);
    });

    void previewBrokerSync()
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((previewError: unknown) => {
        if (!cancelled) {
          setConnectError(
            getRejectedMessage(previewError, ERROR_MESSAGES.BROKER_SYNC_PREVIEW_FAILED)
          );
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  async function handleConfirmImport(): Promise<void> {
    if (!preview) return;

    const isHoldingsSync = preview.broker === 'SNAPTRADE';
    setIsConfirmLoading(true);

    try {
      const result = isHoldingsSync
        ? await confirmBrokerSync(preview.importId)
        : await confirmBrokerImport(preview.importId);

      await Promise.all([
        dispatch(fetchPortfolioSummaryThunk()),
        dispatch(fetchInvestmentSummaryThunk()),
        dispatch(fetchPositionsPageThunk({ offset: 0, append: false })),
        dispatch(fetchTransactionsPageThunk({ offset: 0, append: false })),
      ]);

      const noun = isHoldingsSync ? 'holding' : 'trade';
      setImportResultModal({
        type: 'success',
        title: isHoldingsSync ? 'Holdings synced' : 'Import complete',
        message:
          `Successfully ${isHoldingsSync ? 'synced' : 'imported'} ${result.importedCount} ${noun}${result.importedCount === 1 ? '' : 's'}.` +
          (result.skippedDuplicateCount > 0
            ? isHoldingsSync
              ? ` ${result.skippedDuplicateCount} ticker${result.skippedDuplicateCount === 1 ? '' : 's'} left unchanged because they already have imported or manual trades.`
              : ` ${result.skippedDuplicateCount} duplicate${result.skippedDuplicateCount === 1 ? '' : 's'} skipped.`
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
        title: isHoldingsSync ? 'Sync failed' : 'Import failed',
        message: getRejectedMessage(
          confirmError,
          isHoldingsSync
            ? ERROR_MESSAGES.BROKER_SYNC_CONFIRM_FAILED
            : ERROR_MESSAGES.IMPORT_CONFIRM_FAILED
        ),
      });
    } finally {
      setIsConfirmLoading(false);
    }
  }

  const previewTrades = preview?.trades.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const previewSkipped = preview?.skipped.slice(0, MAX_PREVIEW_ROWS) ?? [];
  const importableCount = preview ? preview.summary.tradeCount - preview.summary.duplicateCount : 0;
  const isHoldingsPreview = preview?.broker === 'SNAPTRADE';
  const confirmLabel = isHoldingsPreview
    ? `Sync ${importableCount} holding${importableCount === 1 ? '' : 's'}`
    : `Import ${importableCount} trades`;

  return (
    <div className={pageStyles.panelContent}>
      <div className={pageStyles.panelHeader}>
        <div className={pageStyles.panelHeaderIcon}>
          <Upload size={16} />
        </div>
        <div>
          <h2 className={pageStyles.panelTitle}>Add holdings</h2>
          <p className={pageStyles.panelSubtitle}>
            Two separate options. Uploading a spreadsheet does not require a brokerage login.
          </p>
        </div>
      </div>

      <section className={styles.pathCard} aria-labelledby="upload-path-title">
        <p className={styles.pathEyebrow}>Option 1</p>
        <h3 id="upload-path-title" className={styles.pathTitle}>
          Upload a statement
        </h3>
        <p className={styles.pathHint}>
          Revolut and any other broker. Drop an .xlsx or .csv export. Parsing stays in memory; the
          file is never stored. PDF is not supported.
        </p>

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
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
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
              <p className={pageStyles.dropZoneHint}>Accepts: .xlsx, .csv · Max 5 MB · No PDF</p>
            </div>
          )}
        </div>

        {fileError && <ErrorBanner message={fileError} className={styles.errorText} />}
      </section>

      <div className={styles.pathDivider} role="separator">
        <span>or</span>
      </div>

      <section className={styles.pathCard} aria-labelledby="connect-path-title">
        <p className={styles.pathEyebrow}>Option 2 · Plus only</p>
        <div className={styles.connectHeader}>
          <div className={styles.connectIcon}>
            <Link2 size={16} />
          </div>
          <div>
            <h3 id="connect-path-title" className={styles.pathTitle}>
              Connect a brokerage
            </h3>
            <p className={styles.pathHint}>
              Optional snapshot of today&apos;s holdings from Trading 212, DEGIRO, eToro, or
              Interactive Brokers. Not required for the file upload above. Read-only — we never
              store your brokerage password.
            </p>
          </div>
        </div>
        <div className={styles.connectActions}>
          <Select
            className={styles.brokerSelect}
            label="Brokerage"
            value={selectedBroker}
            onChange={setSelectedBroker}
            disabled={isConnectingBroker || isPreviewLoading}
            options={SNAPTRADE_CONNECTABLE_BROKERS.map((broker) => ({
              value: broker.id,
              label: broker.label,
              iconUrl: broker.logoUrl,
            }))}
          />
          <Button
            className={styles.connectButton}
            variant="primary"
            onClick={() => void handleConnectBroker(selectedBroker)}
            disabled={isConnectingBroker || isPreviewLoading}
            leftIcon={isConnectingBroker ? <Loader size={14} /> : undefined}
          >
            {isConnectingBroker ? 'Opening…' : 'Connect'}
          </Button>
        </div>
        {!isPaid && (
          <p className={styles.connectUpgrade}>
            Free accounts stay on Option 1. Connect is included with Plus.
          </p>
        )}
        {connectError && <ErrorBanner message={connectError} className={styles.errorText} />}
        <BrokerConnectionsList />
      </section>

      <ImportResultModal
        isOpen={importResultModal !== null}
        type={importResultModal?.type ?? 'success'}
        title={importResultModal?.title ?? ''}
        message={importResultModal?.message ?? ''}
        onClose={closeImportResultModal}
      />

      {preview && (
        <div className={styles.previewSection}>
          <div className={styles.parserMeta}>
            <span
              className={`${styles.modeBadge} ${
                preview.parserMode === 'heuristic'
                  ? styles.modeBadgeHeuristic
                  : preview.parserMode === 'broker_sync'
                    ? styles.modeBadgeSync
                    : styles.modeBadgeAi
              }`}
            >
              {PARSER_MODE_LABELS[preview.parserMode]}
            </span>
            <span className={styles.metaText}>
              Confidence {(preview.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {preview.warning && <p className={styles.previewWarning}>{preview.warning}</p>}

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryValue}>{preview.summary.tradeCount}</div>
              <div className={styles.summaryLabel}>
                {isHoldingsPreview ? 'Holdings found' : 'Trades found'}
              </div>
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
            <h3 className={styles.previewTitle}>
              {isHoldingsPreview ? 'Holdings to sync' : 'Trades to import'}
            </h3>
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
                Showing first {MAX_PREVIEW_ROWS} of {preview.trades.length}{' '}
                {isHoldingsPreview ? 'holdings' : 'trades'}
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
              {isConfirmLoading ? (isHoldingsPreview ? 'Syncing…' : 'Importing…') : confirmLabel}
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
