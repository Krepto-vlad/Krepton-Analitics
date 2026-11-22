import { useState } from 'react';
import { Download, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import {
  DEFAULT_PORTFOLIO_EXPORT_FORMAT,
  ERROR_MESSAGES,
  type PortfolioExportFormat,
} from '../../../constants';
import { exportPortfolioData } from '../../../api/portfolioApi';
import { getRejectedMessage } from '../../../utils/apiError';
import styles from '../ProfilePage.module.scss';
import { ProfileDialog } from './ProfileDialog';

interface ExportPortfolioDialogProps {
  hasPassword: boolean;
  hasGoogle: boolean;
  onClose: () => void;
  onExported: (message: string) => void;
}

export function ExportPortfolioDialog({
  hasPassword,
  hasGoogle,
  onClose,
  onExported,
}: ExportPortfolioDialogProps) {
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [exportGoogleIdToken, setExportGoogleIdToken] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<PortfolioExportFormat>(
    DEFAULT_PORTFOLIO_EXPORT_FORMAT
  );
  const [isExportingData, setIsExportingData] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const hasExportPasswordStepUp = exportPassword.length > 0;
  const hasExportGoogleStepUp = Boolean(exportGoogleIdToken);
  const canExport =
    (hasExportPasswordStepUp || hasExportGoogleStepUp) &&
    !(hasExportPasswordStepUp && hasExportGoogleStepUp);
  const confirmationMethod =
    hasPassword && hasGoogle ? 'password or Google' : hasGoogle ? 'Google' : 'your password';

  async function handleExportPortfolioData(): Promise<void> {
    if (!canExport) {
      return;
    }

    setIsExportingData(true);
    setExportError(null);

    try {
      const { fileName } = await exportPortfolioData(
        {
          password: hasExportPasswordStepUp ? exportPassword : undefined,
          googleIdToken: hasExportGoogleStepUp ? (exportGoogleIdToken ?? undefined) : undefined,
        },
        exportFormat
      );
      onExported(`Downloaded ${fileName}. Keep the file private.`);
    } catch (error) {
      setExportError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_EXPORT_FAILED));
      setExportPassword('');
      setShowExportPassword(false);
      setExportGoogleIdToken(null);
      setIsExportingData(false);
    }
  }

  return (
    <ProfileDialog titleId="export-data-title" onClose={onClose} disableClose={isExportingData}>
      <h3 id="export-data-title" className={styles.modalTitle}>
        Export portfolio data
      </h3>
      <p className={styles.securityHint}>
        Confirm with {confirmationMethod} before download. Excel has Positions, Transactions,
        Watchlist, and Brokerage connections sheets; JSON is one file.
      </p>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Format</span>
        <div className={styles.formatToggle}>
          <button
            type="button"
            className={`${styles.formatButton} ${
              exportFormat === 'xlsx' ? styles.formatButtonActive : ''
            }`}
            onClick={() => setExportFormat('xlsx')}
            disabled={isExportingData}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            className={`${styles.formatButton} ${
              exportFormat === 'json' ? styles.formatButtonActive : ''
            }`}
            onClick={() => setExportFormat('json')}
            disabled={isExportingData}
          >
            JSON
          </button>
        </div>
        <p className={styles.formatHint}>
          Excel: Positions, Transactions (with source), Watchlist, Brokerage connections, plus
          Summary. JSON: the same snapshot for a technical backup. Several connected brokers appear
          as separate rows.
        </p>
      </div>

      {hasPassword && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Password</span>
          <div className={styles.passwordInputWrap}>
            <input
              type={showExportPassword ? 'text' : 'password'}
              className={styles.passwordInput}
              value={exportPassword}
              onChange={(event) => {
                setExportPassword(event.target.value);
                setExportGoogleIdToken(null);
              }}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isExportingData || Boolean(exportGoogleIdToken)}
            />
            <button
              type="button"
              className={styles.togglePasswordButton}
              onClick={() => setShowExportPassword((visible) => !visible)}
              aria-label={showExportPassword ? 'Hide password' : 'Show password'}
              disabled={isExportingData}
            >
              {showExportPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      )}

      {hasGoogle && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Or confirm with Google</span>
          {exportGoogleIdToken ? (
            <p className={styles.statusMessage}>Google confirmation ready.</p>
          ) : (
            <GoogleSignInButton
              text="continue_with"
              disabled={isExportingData || exportPassword.length > 0}
              onCredential={(idToken) => {
                setExportGoogleIdToken(idToken);
                setExportPassword('');
                setExportError(null);
              }}
              onError={() => setExportError(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)}
            />
          )}
        </div>
      )}

      {exportError && <p className={styles.errorMessage}>{exportError}</p>}

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onClose}
          disabled={isExportingData}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void handleExportPortfolioData()}
          disabled={!canExport || isExportingData}
        >
          {isExportingData ? (
            <>
              <Loader2 size={14} className={styles.spinner} />
              Exporting…
            </>
          ) : (
            <>
              <Download size={14} />
              {exportFormat === 'xlsx' ? 'Download Excel' : 'Download JSON'}
            </>
          )}
        </button>
      </div>
    </ProfileDialog>
  );
}
