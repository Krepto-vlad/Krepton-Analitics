import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  MonitorSmartphone,
  Smartphone,
  Trash2,
  User,
  UserX,
} from 'lucide-react';
import {
  ACCOUNT_DELETE_CONFIRMATION,
  DEFAULT_PORTFOLIO_EXPORT_FORMAT,
  ERROR_MESSAGES,
  PORTFOLIO_DATA_DELETE_CONFIRMATION,
  PORTFOLIO_IMPORTER_PATH,
  ROUTES,
  type PortfolioExportFormat,
} from '../../constants';
import { PRICING_PLAN_DEFINITIONS } from '../../constants/pricingPlans';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { apiChangePassword, apiDeleteAccount } from '../../api/authApi';
import { deletePortfolioData, exportPortfolioData } from '../../api/portfolioApi';
import { BrokerConnectionsList } from '../../components/broker/BrokerConnectionsList';
import { BEGINNER_TUTORIAL_REPLAY_LABEL } from '../../content/beginnerTutorial';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCurrentUserThunk, logoutThunk } from '../../features/auth/authSlice';
import {
  fetchInvestmentSummaryThunk,
  fetchPortfolioEquityHistoryThunk,
  fetchPortfolioNewsThunk,
  fetchPortfolioRebalancingThunk,
  fetchPortfolioSummaryThunk,
  fetchPositionsPageThunk,
  fetchTransactionsPageThunk,
} from '../../features/portfolio/portfolioSlice';
import { fetchWatchlistThunk } from '../../features/watchlist/watchlistSlice';
import { getRejectedMessage } from '../../utils/apiError';
import { formatMemberSince, getEmailInitials, maskEmail } from '../../utils/emailDisplay';
import {
  formatSubscriptionHeadline,
  formatSubscriptionPeriodEnd,
} from '../../utils/subscriptionDisplay';
import { clearPersistedAlignmentExplanation } from '../../utils/alignmentExplainStorage';
import { clearPersistedNewsBriefing } from '../../utils/newsBriefingStorage';
import {
  PASSWORD_RULES,
  PASSWORD_STRENGTH_BAR_NUMBERS,
  PASSWORD_STRENGTH_LABELS,
  calculatePasswordStrength,
  isPasswordStrong,
} from '../../utils/passwordValidation';
import { joinClassNames } from '../../utils/classNames';
import {
  requestBeginnerTutorial,
  resetBeginnerTutorial,
} from '../../utils/beginnerTutorialStorage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './ProfilePage.module.scss';

const FREE_PLAN_FEATURES =
  PRICING_PLAN_DEFINITIONS.find((plan) => plan.id === 'free')?.features ?? [];

interface ProfileDialogProps {
  titleId: string;
  onClose: () => void;
  disableClose?: boolean;
  children: ReactNode;
}

function ProfileDialog({ titleId, onClose, disableClose = false, children }: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: true,
    onEscape: disableClose ? undefined : onClose,
  });

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!disableClose) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordGoogleIdToken, setPasswordGoogleIdToken] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const [isAccountDeleteModalOpen, setIsAccountDeleteModalOpen] = useState(false);
  const [accountDeleteConfirmText, setAccountDeleteConfirmText] = useState('');
  const [accountDeletePassword, setAccountDeletePassword] = useState('');
  const [showAccountDeletePassword, setShowAccountDeletePassword] = useState(false);
  const [accountDeleteGoogleIdToken, setAccountDeleteGoogleIdToken] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [exportGoogleIdToken, setExportGoogleIdToken] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<PortfolioExportFormat>(
    DEFAULT_PORTFOLIO_EXPORT_FORMAT
  );
  const [isExportingData, setIsExportingData] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const maskedEmail = user ? maskEmail(user.email) : '—';
  const initials = user ? getEmailInitials(user.email) : '??';
  const memberSince = user?.createdAt ? formatMemberSince(user.createdAt) : '—';
  const hasPassword = Boolean(user?.hasPassword);
  const hasGoogle = Boolean(user?.hasGoogle);

  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const hasPasswordStepUp = currentPassword.length > 0;
  const hasGooglePasswordStepUp = Boolean(passwordGoogleIdToken);
  const canSubmitPassword =
    isPasswordStrong(newPassword) &&
    passwordsMatch &&
    (hasPasswordStepUp || hasGooglePasswordStepUp) &&
    !(hasPasswordStepUp && hasGooglePasswordStepUp);

  const canDelete = deleteConfirmText.trim().toUpperCase() === PORTFOLIO_DATA_DELETE_CONFIRMATION;
  const hasExportPasswordStepUp = exportPassword.length > 0;
  const hasExportGoogleStepUp = Boolean(exportGoogleIdToken);
  const canExport =
    (hasExportPasswordStepUp || hasExportGoogleStepUp) &&
    !(hasExportPasswordStepUp && hasExportGoogleStepUp);

  const hasAccountDeletePasswordStepUp = accountDeletePassword.length > 0;
  const hasAccountDeleteGoogleStepUp = Boolean(accountDeleteGoogleIdToken);
  const canAccountDeleteStepUp =
    (hasAccountDeletePasswordStepUp || hasAccountDeleteGoogleStepUp) &&
    !(hasAccountDeletePasswordStepUp && hasAccountDeleteGoogleStepUp);
  const canDeleteAccount =
    accountDeleteConfirmText.trim().toUpperCase() === ACCOUNT_DELETE_CONFIRMATION &&
    canAccountDeleteStepUp;

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setPasswordGoogleIdToken(null);
    setPasswordError(null);
  }

  function closeExportModal() {
    setIsExportModalOpen(false);
    setExportPassword('');
    setShowExportPassword(false);
    setExportGoogleIdToken(null);
    setExportFormat(DEFAULT_PORTFOLIO_EXPORT_FORMAT);
    setExportError(null);
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!canSubmitPassword) {
      setPasswordError('Confirm with password or Google, then enter a strong new password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiChangePassword({
        newPassword,
        password: hasPasswordStepUp ? currentPassword : undefined,
        googleIdToken: hasGooglePasswordStepUp ? (passwordGoogleIdToken ?? undefined) : undefined,
      });
      setPasswordMessage('Password updated successfully.');
      await dispatch(fetchCurrentUserThunk());
      closePasswordModal();
    } catch (error) {
      setPasswordError(getRejectedMessage(error, ERROR_MESSAGES.AUTH_CHANGE_PASSWORD_FAILED));
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleExportPortfolioData() {
    if (!canExport) {
      return;
    }

    setIsExportingData(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const { fileName } = await exportPortfolioData(
        {
          password: hasExportPasswordStepUp ? exportPassword : undefined,
          googleIdToken: hasExportGoogleStepUp ? (exportGoogleIdToken ?? undefined) : undefined,
        },
        exportFormat
      );
      setExportMessage(`Downloaded ${fileName}. Keep the file private.`);
      closeExportModal();
    } catch (error) {
      setExportError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_EXPORT_FAILED));
    } finally {
      setExportPassword('');
      setShowExportPassword(false);
      setExportGoogleIdToken(null);
      setIsExportingData(false);
    }
  }

  function closeAccountDeleteModal(): void {
    if (isDeletingAccount) {
      return;
    }
    setIsAccountDeleteModalOpen(false);
    setAccountDeleteConfirmText('');
    setAccountDeletePassword('');
    setShowAccountDeletePassword(false);
    setAccountDeleteGoogleIdToken(null);
    setAccountDeleteError(null);
  }

  async function handleDeleteAccount(): Promise<void> {
    if (!canDeleteAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setAccountDeleteError(null);

    try {
      await apiDeleteAccount({
        confirm: ACCOUNT_DELETE_CONFIRMATION,
        password: hasAccountDeletePasswordStepUp ? accountDeletePassword : undefined,
        googleIdToken: hasAccountDeleteGoogleStepUp
          ? (accountDeleteGoogleIdToken ?? undefined)
          : undefined,
      });

      clearPersistedNewsBriefing();
      clearPersistedAlignmentExplanation();
      // Cookie already cleared by delete endpoint; logout clears client auth state.
      await dispatch(logoutThunk());
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      setAccountDeleteError(getRejectedMessage(error, ERROR_MESSAGES.AUTH_DELETE_ACCOUNT_FAILED));
      setAccountDeletePassword('');
      setAccountDeleteGoogleIdToken(null);
      setIsDeletingAccount(false);
    }
  }

  async function handleDeletePortfolioData() {
    if (!canDelete) {
      return;
    }

    setIsDeletingData(true);
    setDeleteError(null);
    setDeleteMessage(null);

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

      setDeleteMessage(
        `Deleted ${result.deletedPositions} positions, ${result.deletedTransactions} transactions, and ${result.deletedWatchlistItems} watchlist items.`
      );
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
    } catch (error) {
      setDeleteError(getRejectedMessage(error, ERROR_MESSAGES.PORTFOLIO_DELETE_DATA_FAILED));
    } finally {
      setIsDeletingData(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <User size={22} className={styles.titleIcon} />
          <h2 className={styles.title}>My Profile</h2>
        </div>
        <p className={styles.subtitle}>Manage your account, security settings and subscription.</p>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Account</p>
          <h2 className={styles.cardTitle}>Profile Overview</h2>
        </div>
        <div className={styles.overviewRow}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.overviewInfo}>
            <div className={styles.overviewNameRow}>
              <p className={styles.overviewEmail}>{maskedEmail}</p>
              <span className={styles.planBadge}>
                {user.subscription?.isPaid ? 'Plus plan' : 'Free plan'}
              </span>
            </div>
            <p className={styles.overviewMeta}>Member since {memberSince}</p>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Settings</p>
          <h2 className={styles.cardTitle}>Account Settings</h2>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email</span>
          <input className={styles.fieldInput} value={maskedEmail} disabled readOnly />
        </label>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Security</p>
          <h2 className={styles.cardTitle}>Security</h2>
        </div>

        <div className={styles.securityList}>
          <div className={styles.securityRow}>
            <div className={styles.securityLeft}>
              <KeyRound size={18} className={styles.securityIcon} />
              <div className={styles.securityText}>
                <p className={styles.securityTitle}>Password</p>
                <p className={styles.securityHint}>Change your account password</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.accentButton}
              onClick={() => {
                setPasswordMessage(null);
                setIsPasswordModalOpen(true);
              }}
            >
              {hasPassword ? 'Change Password' : 'Set Password'}
            </button>
          </div>

          <div className={styles.securityRow}>
            <div className={styles.securityLeft}>
              <Smartphone size={18} className={styles.securityIcon} />
              <div className={styles.securityText}>
                <p className={styles.securityTitle}>Two-Factor Auth</p>
                <p className={styles.securityHint}>Authenticator App</p>
              </div>
            </div>
            <span className={styles.comingSoon}>Coming soon</span>
          </div>

          <div className={styles.securityRow}>
            <div className={styles.securityLeft}>
              <MonitorSmartphone size={18} className={styles.securityIcon} />
              <div className={styles.securityText}>
                <p className={styles.securityTitle}>Active Sessions</p>
                <p className={styles.securityHint}>Manage signed-in devices</p>
              </div>
            </div>
            <span className={styles.comingSoon}>Coming soon</span>
          </div>
        </div>

        {passwordMessage && <p className={styles.statusMessage}>{passwordMessage}</p>}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Billing</p>
          <h2 className={styles.cardTitle}>Subscription</h2>
        </div>

        <div className={styles.subscriptionCard}>
          <div className={styles.subscriptionInfo}>
            <CreditCard size={20} className={styles.securityIcon} />
            <div>
              <p className={styles.subscriptionTitle}>
                {user?.subscription
                  ? formatSubscriptionHeadline(user.subscription)
                  : 'Free — $0 / forever'}
              </p>
              <p className={styles.subscriptionHint}>
                {user?.subscription
                  ? (formatSubscriptionPeriodEnd(user.subscription) ??
                    'Paid plans are sold by Paddle. Card numbers never reach Krepton.')
                  : 'Paid plans are sold by Paddle. Card numbers never reach Krepton.'}
              </p>
            </div>
          </div>
          <span className={styles.activeBadge}>
            {user?.subscription?.isPaid ? 'Plus' : 'Active'}
          </span>
        </div>

        <ul className={styles.featureList}>
          {(user?.subscription?.isPaid
            ? (PRICING_PLAN_DEFINITIONS.find((plan) => plan.id === 'plus_monthly')?.features ??
              FREE_PLAN_FEATURES)
            : FREE_PLAN_FEATURES
          ).map((feature) => (
            <li key={feature} className={styles.featureItem}>
              <Check size={14} className={styles.featureCheck} />
              {feature}
            </li>
          ))}
        </ul>

        <Link to={ROUTES.SUBSCRIPTION} className={styles.accentButton}>
          Manage subscription
        </Link>
        {user?.isAdmin && (
          <Link to={ROUTES.ADMIN} className={styles.secondaryButton}>
            Admin grants
          </Link>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Help</p>
          <h2 className={styles.cardTitle}>Beginner tutorial</h2>
        </div>
        <div className={styles.dataActionRow}>
          <div className={styles.dataActionCopy}>
            <p className={styles.securityTitle}>New to the app?</p>
            <p className={styles.securityHint}>
              A short tour of holdings, Dashboard, research tools, and privacy. It appears once
              after sign-in; you can replay it here.
            </p>
          </div>
          <button
            type="button"
            className={styles.accentButton}
            onClick={() => {
              if (!user) {
                return;
              }
              resetBeginnerTutorial(user.id);
              requestBeginnerTutorial();
            }}
          >
            <BookOpen size={14} />
            {BEGINNER_TUTORIAL_REPLAY_LABEL}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Brokerage</p>
          <h2 className={styles.cardTitle}>Connected brokerages</h2>
        </div>
        <div className={styles.dataActionRow}>
          <div className={styles.dataActionCopy}>
            <p className={styles.securityHint}>
              Disconnect removes the SnapTrade authorization. Synced holdings stay in your portfolio
              until you delete them.
            </p>
          </div>
          <Link
            to={user.subscription?.isPaid ? PORTFOLIO_IMPORTER_PATH : ROUTES.SUBSCRIPTION}
            className={styles.accentButton}
          >
            <Link2 size={14} />
            Add connection
          </Link>
        </div>
        <BrokerConnectionsList hideHeader />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardLabel}>Privacy</p>
          <h2 className={styles.cardTitle}>Privacy &amp; Data</h2>
        </div>

        <div className={styles.legalLinks}>
          <Link to={ROUTES.LEGAL} className={styles.legalLink}>
            Legal Documents
          </Link>
          <Link to={ROUTES.PRIVACY} className={styles.legalLink}>
            Privacy Policy
          </Link>
          <Link to={ROUTES.TERMS} className={styles.legalLink}>
            Terms of Service
          </Link>
        </div>

        <div className={styles.dataActionRow}>
          <div className={styles.dataActionCopy}>
            <p className={styles.securityTitle}>Export your data</p>
            <p className={styles.securityHint}>
              Download a copy of your portfolio snapshot (positions, transactions with source,
              watchlist, and connected brokerages). SnapTrade secrets and brokerage account numbers
              are never included.
            </p>
          </div>
          <button
            type="button"
            className={styles.accentButton}
            onClick={() => {
              setExportError(null);
              setExportMessage(null);
              setIsExportModalOpen(true);
            }}
          >
            <Download size={14} />
            Export my data
          </button>
        </div>

        {exportMessage && <p className={styles.statusMessage}>{exportMessage}</p>}

        <div className={styles.dangerZone}>
          <div className={styles.dangerZoneHeader}>
            <AlertTriangle size={16} />
            <div>
              <p className={styles.dangerZoneTitle}>Danger zone</p>
              <p className={styles.dangerZoneSubtitle}>
                Irreversible actions. Choose carefully — these cannot be undone.
              </p>
            </div>
          </div>

          <div className={styles.dangerPanel}>
            <div className={styles.dangerPanelBody}>
              <p className={styles.dangerPanelEyebrow}>Portfolio only</p>
              <p className={styles.dangerPanelTitle}>Delete portfolio data</p>
              <p className={styles.dangerPanelText}>
                Removes holdings, transactions and watchlist. Your login stays active so you can
                start a new portfolio later.
              </p>
            </div>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => {
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
            >
              <Trash2 size={14} />
              Wipe portfolio
            </button>
          </div>

          {deleteMessage && <p className={styles.statusMessage}>{deleteMessage}</p>}

          <div className={`${styles.dangerPanel} ${styles.dangerPanelCritical}`}>
            <div className={styles.dangerPanelBody}>
              <p className={styles.dangerPanelEyebrowCritical}>GDPR account erasure</p>
              <p className={styles.dangerPanelTitle}>Delete entire account</p>
              <p className={styles.dangerPanelText}>
                Permanently deletes your login, portfolio, AI history and all related data. Requires
                password or Google confirmation.
              </p>
            </div>
            <button
              type="button"
              className={styles.dangerButtonFilled}
              onClick={() => {
                setAccountDeleteError(null);
                setIsAccountDeleteModalOpen(true);
              }}
            >
              <UserX size={14} />
              Delete my account
            </button>
          </div>
        </div>
      </section>

      {isPasswordModalOpen && (
        <ProfileDialog
          titleId="change-password-title"
          onClose={closePasswordModal}
          disableClose={isChangingPassword}
        >
          <h3 id="change-password-title" className={styles.modalTitle}>
            {hasPassword ? 'Change password' : 'Set password'}
          </h3>
          <p className={styles.securityHint}>
            Confirm with{' '}
            {hasPassword && hasGoogle
              ? 'password or Google'
              : hasGoogle
                ? 'Google'
                : 'your current password'}{' '}
            before saving a new password.
          </p>

          {hasPassword && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Current password</span>
              <div className={styles.passwordInputWrap}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordGoogleIdToken(null);
                  }}
                  autoComplete="current-password"
                  placeholder="Your current password"
                  disabled={Boolean(passwordGoogleIdToken)}
                />
                <button
                  type="button"
                  className={styles.togglePasswordButton}
                  onClick={() => setShowCurrentPassword((visible) => !visible)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {hasGoogle && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Or confirm with Google</span>
              {passwordGoogleIdToken ? (
                <p className={styles.statusMessage}>Google confirmation ready.</p>
              ) : (
                <GoogleSignInButton
                  text="continue_with"
                  disabled={isChangingPassword || currentPassword.length > 0}
                  onCredential={(idToken) => {
                    setPasswordGoogleIdToken(idToken);
                    setCurrentPassword('');
                    setPasswordError(null);
                  }}
                  onError={() => setPasswordError(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)}
                />
              )}
            </div>
          )}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>New password</span>
            <input
              type="password"
              className={styles.fieldInput}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Min. 10 chars, uppercase, number, symbol"
            />

            {newPassword.length > 0 && (
              <div
                className={joinClassNames(
                  styles.strengthRow,
                  passwordStrength > 0 && styles[`strengthLevel${passwordStrength}`]
                )}
              >
                <div className={styles.strengthBars}>
                  {PASSWORD_STRENGTH_BAR_NUMBERS.map((barNumber) => (
                    <div
                      key={barNumber}
                      className={joinClassNames(
                        styles.strengthBar,
                        barNumber <= passwordStrength && styles.filled
                      )}
                    />
                  ))}
                </div>
                <span className={styles.strengthLabel}>
                  {PASSWORD_STRENGTH_LABELS[passwordStrength]}
                </span>
              </div>
            )}

            <div className={styles.passwordRules}>
              <p className={styles.passwordRulesTitle}>Password requirements</p>
              {PASSWORD_RULES.map((rule) => {
                const passed = newPassword.length > 0 && rule.test(newPassword);
                const touched = newPassword.length > 0;
                const ruleStateClassName = passed
                  ? styles.passed
                  : touched
                    ? styles.failed
                    : undefined;

                return (
                  <div
                    key={rule.id}
                    className={joinClassNames(styles.passwordRule, ruleStateClassName)}
                  >
                    <div className={joinClassNames(styles.passwordRuleIcon, ruleStateClassName)}>
                      {passed && <Check size={8} />}
                      {!passed && touched && <span className={styles.passwordRuleFailMark}>✕</span>}
                    </div>
                    {rule.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Confirm new password</span>
            <div
              className={`${styles.passwordInputWrap} ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? styles.passwordInputWrapSuccess
                    : styles.passwordInputWrapError
                  : ''
              }`}
            >
              <input
                type="password"
                className={styles.passwordInput}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Repeat your new password"
              />
              {confirmPassword.length > 0 &&
                (passwordsMatch ? (
                  <Check size={14} color="#10B981" />
                ) : (
                  <span className={styles.passwordRuleFailMark}>✕</span>
                ))}
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className={styles.fieldHintError}>Passwords do not match</p>
            )}
            {passwordsMatch && <p className={styles.fieldHintSuccess}>Passwords match ✓</p>}
          </div>

          {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={closePasswordModal}
              disabled={isChangingPassword}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void handleChangePassword()}
              disabled={!canSubmitPassword || isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
                  Saving…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </ProfileDialog>
      )}

      {isExportModalOpen && (
        <ProfileDialog
          titleId="export-data-title"
          onClose={closeExportModal}
          disableClose={isExportingData}
        >
          <h3 id="export-data-title" className={styles.modalTitle}>
            Export portfolio data
          </h3>
          <p className={styles.securityHint}>
            Confirm with{' '}
            {hasPassword && hasGoogle
              ? 'password or Google'
              : hasGoogle
                ? 'Google'
                : 'your password'}{' '}
            before download. Excel has Positions, Transactions, Watchlist, and Brokerage connections
            sheets; JSON is one file.
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
              Summary. JSON: the same snapshot for a technical backup. Several connected brokers
              appear as separate rows.
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
              onClick={closeExportModal}
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
      )}

      {isDeleteModalOpen && (
        <ProfileDialog
          titleId="delete-data-title"
          onClose={() => setIsDeleteModalOpen(false)}
          disableClose={isDeletingData}
        >
          <h3 id="delete-data-title" className={styles.modalTitle}>
            Delete portfolio data
          </h3>
          <p className={styles.securityHint}>
            Type <strong>{PORTFOLIO_DATA_DELETE_CONFIRMATION}</strong> to confirm permanent deletion
            of holdings, transactions and watchlist.
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
              onClick={() => setIsDeleteModalOpen(false)}
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
      )}

      {isAccountDeleteModalOpen && (
        <ProfileDialog
          titleId="delete-account-title"
          onClose={closeAccountDeleteModal}
          disableClose={isDeletingAccount}
        >
          <h3 id="delete-account-title" className={styles.modalTitle}>
            Delete account
          </h3>
          <p className={styles.securityHint}>
            This permanently removes your account, portfolio, and AI history. Confirm with{' '}
            {hasPassword && hasGoogle
              ? 'password or Google'
              : hasGoogle
                ? 'Google'
                : 'your password'}
            , then type <strong>{ACCOUNT_DELETE_CONFIRMATION}</strong>.
          </p>

          {hasPassword && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Password</span>
              <div className={styles.passwordInputWrap}>
                <input
                  type={showAccountDeletePassword ? 'text' : 'password'}
                  className={styles.passwordInput}
                  value={accountDeletePassword}
                  onChange={(event) => {
                    setAccountDeletePassword(event.target.value);
                    setAccountDeleteGoogleIdToken(null);
                  }}
                  autoComplete="current-password"
                  placeholder="Your password"
                  disabled={isDeletingAccount || Boolean(accountDeleteGoogleIdToken)}
                />
                <button
                  type="button"
                  className={styles.togglePasswordButton}
                  onClick={() => setShowAccountDeletePassword((visible) => !visible)}
                  aria-label={showAccountDeletePassword ? 'Hide password' : 'Show password'}
                >
                  {showAccountDeletePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {hasGoogle && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Or confirm with Google</span>
              {accountDeleteGoogleIdToken ? (
                <p className={styles.statusMessage}>Google confirmation ready.</p>
              ) : (
                <GoogleSignInButton
                  text="continue_with"
                  disabled={isDeletingAccount || accountDeletePassword.length > 0}
                  onCredential={(idToken) => {
                    setAccountDeleteGoogleIdToken(idToken);
                    setAccountDeletePassword('');
                    setAccountDeleteError(null);
                  }}
                  onError={() => setAccountDeleteError(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)}
                />
              )}
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Confirmation</span>
            <input
              className={styles.fieldInput}
              value={accountDeleteConfirmText}
              onChange={(event) => setAccountDeleteConfirmText(event.target.value)}
              placeholder={ACCOUNT_DELETE_CONFIRMATION}
              disabled={isDeletingAccount}
            />
          </label>

          {accountDeleteError && <p className={styles.errorMessage}>{accountDeleteError}</p>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={closeAccountDeleteModal}
              disabled={isDeletingAccount}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() => void handleDeleteAccount()}
              disabled={!canDeleteAccount || isDeletingAccount}
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
                  Deleting account…
                </>
              ) : (
                <>
                  <UserX size={14} />
                  Delete my account
                </>
              )}
            </button>
          </div>
        </ProfileDialog>
      )}
    </div>
  );
}
