import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CreditCard,
  Download,
  KeyRound,
  Link2,
  MonitorSmartphone,
  Smartphone,
  Trash2,
  User,
  UserX,
} from 'lucide-react';
import {
  PORTFOLIO_IMPORTER_PATH,
  PROFILE_AI_PERSONAL_DATA_ERROR,
  PROFILE_AI_PERSONAL_DATA_HINT,
  PROFILE_AI_PERSONAL_DATA_TITLE,
  ROUTES,
} from '../../constants';
import { PRICING_PLAN_DEFINITIONS } from '../../constants/pricingPlans';
import { apiUpdateAiPersonalData } from '../../api/authApi';
import { BrokerConnectionsList } from '../../components/broker/BrokerConnectionsList';
import { BEGINNER_TUTORIAL_REPLAY_LABEL } from '../../content/beginnerTutorial';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAiPersonalDataEnabled } from '../../features/auth/authSlice';
import { getRejectedMessage } from '../../utils/apiError';
import { formatMemberSince, getEmailInitials, maskEmail } from '../../utils/emailDisplay';
import {
  formatSubscriptionHeadline,
  formatSubscriptionPeriodEnd,
} from '../../utils/subscriptionDisplay';
import {
  requestBeginnerTutorial,
  resetBeginnerTutorial,
} from '../../utils/beginnerTutorialStorage';
import styles from './ProfilePage.module.scss';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';
import { DeletePortfolioDataDialog } from './components/DeletePortfolioDataDialog';
import { ExportPortfolioDialog } from './components/ExportPortfolioDialog';

const FREE_PLAN_FEATURES =
  PRICING_PLAN_DEFINITIONS.find((plan) => plan.id === 'free')?.features ?? [];

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isAccountDeleteModalOpen, setIsAccountDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSavingAiPersonalData, setIsSavingAiPersonalData] = useState(false);
  const [aiPersonalDataError, setAiPersonalDataError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const aiPersonalDataEnabled = user?.aiPersonalDataEnabled !== false;
  const maskedEmail = user ? maskEmail(user.email) : '—';
  const initials = user ? getEmailInitials(user.email) : '??';
  const memberSince = user?.createdAt ? formatMemberSince(user.createdAt) : '—';
  const hasPassword = Boolean(user?.hasPassword);
  const hasGoogle = Boolean(user?.hasGoogle);

  async function handleAiPersonalDataChange(enabled: boolean): Promise<void> {
    setAiPersonalDataError(null);
    setIsSavingAiPersonalData(true);

    try {
      const updatedUser = await apiUpdateAiPersonalData(enabled);
      dispatch(setAiPersonalDataEnabled(updatedUser.aiPersonalDataEnabled !== false));
    } catch (error) {
      setAiPersonalDataError(getRejectedMessage(error, PROFILE_AI_PERSONAL_DATA_ERROR));
    } finally {
      setIsSavingAiPersonalData(false);
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

        <div className={styles.dataActionRow}>
          <div className={styles.dataActionCopy}>
            <p className={styles.securityTitle}>{PROFILE_AI_PERSONAL_DATA_TITLE}</p>
            <p className={styles.securityHint}>{PROFILE_AI_PERSONAL_DATA_HINT}</p>
          </div>
          <label className={styles.aiDataToggle}>
            <input
              type="checkbox"
              checked={aiPersonalDataEnabled}
              disabled={isSavingAiPersonalData}
              onChange={(event) => {
                void handleAiPersonalDataChange(event.target.checked);
              }}
            />
            <span>{aiPersonalDataEnabled ? 'On' : 'Off'}</span>
          </label>
        </div>
        {aiPersonalDataError && <p className={styles.statusMessage}>{aiPersonalDataError}</p>}

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
        <ChangePasswordDialog
          hasPassword={hasPassword}
          hasGoogle={hasGoogle}
          onClose={() => setIsPasswordModalOpen(false)}
          onUpdated={(message) => {
            setPasswordMessage(message);
            setIsPasswordModalOpen(false);
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportPortfolioDialog
          hasPassword={hasPassword}
          hasGoogle={hasGoogle}
          onClose={() => setIsExportModalOpen(false)}
          onExported={(message) => {
            setExportMessage(message);
            setIsExportModalOpen(false);
          }}
        />
      )}

      {isDeleteModalOpen && (
        <DeletePortfolioDataDialog
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={(message) => {
            setDeleteMessage(message);
            setIsDeleteModalOpen(false);
          }}
        />
      )}

      {isAccountDeleteModalOpen && (
        <DeleteAccountDialog
          hasPassword={hasPassword}
          hasGoogle={hasGoogle}
          onClose={() => setIsAccountDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}
