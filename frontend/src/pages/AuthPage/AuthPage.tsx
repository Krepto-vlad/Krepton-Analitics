import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  TrendingUp,
  Shield,
  ArrowLeft,
  Lock,
  Check,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import {
  API_BASE_URL,
  BACKEND_HEALTH_CHECK_PATH,
  ERROR_MESSAGES,
  LEGAL_NOT_INVESTMENT_ADVICE,
  ROUTES,
} from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { Button, ErrorBanner } from '../../components/ui';
import { Input } from '../../components/ui';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useTheme } from '../../hooks/useTheme';
import { usePageSeo } from '../../hooks/usePageSeo';
import {
  registerThunk,
  loginThunk,
  googleLoginThunk,
  resendVerificationThunk,
  clearAuthError,
  clearAuthInfoMessage,
} from '../../features/auth/authSlice';
import { joinClassNames } from '../../utils/classNames';
import {
  PASSWORD_RULES,
  PASSWORD_STRENGTH_BAR_NUMBERS,
  PASSWORD_STRENGTH_LABELS,
  calculatePasswordStrength,
} from '../../utils/passwordValidation';
import styles from './AuthPage.module.scss';

type AuthMode = 'login' | 'register';

const SECURITY_STRIP_ITEMS = [
  { icon: Lock, label: 'End-to-end encrypted' },
  { icon: Shield, label: 'No KYC required' },
  { icon: AlertTriangle, label: 'Not financial advice' },
];

interface AuthPageProps {
  initialMode?: AuthMode;
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { theme, toggleTheme } = useTheme();
  const { isLoading, error, user, infoMessage, pendingVerificationEmail } = useAppSelector(
    (state) => state.auth
  );

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  usePageSeo(PAGE_SEO_METADATA[mode === 'register' ? ROUTES.REGISTER : ROUTES.LOGIN]);

  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearAuthInfoMessage());
  }, [mode, dispatch]);

  useEffect(() => {
    // Fire-and-forget: pre-warms a scale-to-zero backend container while the
    // user is still typing credentials, so the real login/register request
    // does not pay the full cold-start latency.
    fetch(`${API_BASE_URL}${BACKEND_HEALTH_CHECK_PATH}`, { method: 'GET' }).catch(() => {
      // Ignored — this is a best-effort warm-up, not a health indicator for the UI.
    });
  }, []);

  const passwordStrength = calculatePasswordStrength(password);
  const allRulesPassed = passwordStrength === PASSWORD_RULES.length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isRegisterReady =
    agreed &&
    allRulesPassed &&
    passwordsMatch &&
    nickname.trim().length > 0 &&
    email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && !isRegisterReady) return;

    const credentials = { email: email.trim().toLowerCase(), password };

    if (mode === 'register') {
      await dispatch(registerThunk(credentials));
    } else {
      await dispatch(loginThunk(credentials));
    }
  };

  async function handleGoogleCredential(idToken: string) {
    setGoogleError(null);
    await dispatch(googleLoginThunk(idToken));
  }

  async function handleResendVerification() {
    const targetEmail = pendingVerificationEmail ?? email.trim().toLowerCase();
    if (!targetEmail) {
      return;
    }
    await dispatch(resendVerificationThunk(targetEmail));
  }

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setNickname('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreed(false);
    setGoogleError(null);
  };

  const isSubmitDisabled = isLoading || (mode === 'register' && !isRegisterReady);

  return (
    <main className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.grid} />

      <button type="button" className={styles.backButton} onClick={() => navigate(ROUTES.HOME)}>
        <ArrowLeft size={15} />
        Back to home
      </button>

      <button
        type="button"
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className={styles.content}>
        <div className={styles.logoMark}>
          <div className={styles.logoIcon}>
            <TrendingUp size={16} />
          </div>
          <span className={styles.logoText}>
            Krepton <span>Analytics</span>
          </span>
        </div>

        {/* ── Mode tabs ── */}
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => {
              if (mode !== 'register') {
                switchMode();
              }
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => {
              if (mode !== 'login') {
                switchMode();
              }
            }}
          >
            Sign In
          </button>
        </div>

        {/* ── Card ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>
              {mode === 'register' ? 'Join Krepton' : 'Welcome back'}
            </h1>
            <p className={styles.cardSubtitle}>
              {mode === 'register'
                ? 'No KYC, no names. Email + password, or continue with Google.'
                : 'Sign in with email/password or Google to access your portfolio.'}
            </p>
          </div>

          <div className={styles.cardBody}>
            {mode === 'register' && (
              <div
                className={styles.agreement}
                onClick={() => setAgreed((current) => !current)}
                role="checkbox"
                aria-checked={agreed}
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && setAgreed((current) => !current)}
              >
                <div className={`${styles.checkbox} ${agreed ? styles.checked : ''}`.trim()}>
                  {agreed && <Check size={10} />}
                </div>
                <span className={styles.agreementText}>
                  I agree to the{' '}
                  <Link
                    to={ROUTES.TERMS}
                    className={styles.inlineLegalLink}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to={ROUTES.PRIVACY}
                    className={styles.inlineLegalLink}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>
                  . Insights are for educational purposes only.
                </span>
              </div>
            )}

            <GoogleSignInButton
              text={mode === 'register' ? 'signup_with' : 'continue_with'}
              disabled={isLoading || (mode === 'register' && !agreed)}
              onCredential={(idToken) => void handleGoogleCredential(idToken)}
              onError={() => setGoogleError(ERROR_MESSAGES.AUTH_GOOGLE_LOGIN_FAILED)}
              onDisabledClick={() => {
                if (mode === 'register' && !agreed) {
                  setGoogleError(ERROR_MESSAGES.AUTH_GOOGLE_REQUIRES_TERMS);
                }
              }}
            />
            <div className={styles.authDivider}>
              <span>or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.cardBody}>
            {/* Nickname (register only) */}
            {mode === 'register' && (
              <Input
                id="nickname"
                label="Choose a Nickname"
                type="text"
                placeholder="investor_42"
                value={nickname}
                onChange={setNickname}
                hint="No real names. This is your only identifier."
                autoComplete="off"
                spellCheck={false}
              />
            )}

            {/* Email */}
            <Input
              id="email"
              label={mode === 'register' ? 'Email Address' : 'Email'}
              type="email"
              placeholder={mode === 'register' ? 'name@example.com' : 'your@email.com'}
              value={email}
              onChange={setEmail}
              autoComplete={mode === 'register' ? 'email' : 'username'}
            />

            {/* Password */}
            <div className={styles.fieldGroup}>
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder={
                  mode === 'register' ? 'Min. 10 chars, uppercase, number, symbol' : 'Your password'
                }
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                rightElement={
                  <button
                    type="button"
                    className={styles.togglePasswordBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {/* Strength bar — register only */}
              {mode === 'login' && (
                <div className={styles.forgotPasswordRow}>
                  <Link to={ROUTES.FORGOT_PASSWORD} className={styles.forgotPasswordLink}>
                    Forgot password?
                  </Link>
                </div>
              )}

              {mode === 'register' && password.length > 0 && (
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

              {/* Rules (register only) */}
              {mode === 'register' && (
                <div className={styles.passwordRules}>
                  <p className={styles.passwordRulesTitle}>Password requirements</p>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = password.length > 0 && rule.test(password);
                    const touched = password.length > 0;
                    const ruleStateClass = passed
                      ? styles.passed
                      : touched
                        ? styles.failed
                        : undefined;
                    return (
                      <div
                        key={rule.id}
                        className={`${styles.passwordRule} ${ruleStateClass ?? ''}`.trim()}
                      >
                        <div
                          className={`${styles.passwordRuleIcon} ${ruleStateClass ?? ''}`.trim()}
                        >
                          {passed && <Check size={8} />}
                          {!passed && touched && (
                            <span className={styles.passwordRuleFailMark}>✕</span>
                          )}
                        </div>
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                error={
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'Passwords do not match'
                    : undefined
                }
                success={passwordsMatch ? 'Passwords match ✓' : undefined}
                rightElement={
                  confirmPassword.length > 0 ? (
                    passwordsMatch ? (
                      <Check size={14} className={styles.confirmSuccessIcon} />
                    ) : (
                      <span className={styles.confirmFailMark}>✕</span>
                    )
                  ) : undefined
                }
              />
            )}

            {/* Privacy notice (register only) */}
            {mode === 'register' && (
              <div
                className={styles.privacyNotice}
                role="note"
                aria-label="Privacy protection notice"
              >
                <Shield size={15} className={styles.privacyNoticeIcon} />
                <p>
                  <strong>Privacy Protection Active:</strong> Real names or phone numbers are
                  strictly prohibited. Your identity is never linked to your financial data.
                </p>
              </div>
            )}

            {/* Error / info */}
            {(error || googleError) && <ErrorBanner message={error ?? googleError ?? ''} />}
            {infoMessage && <p className={styles.infoMessage}>{infoMessage}</p>}
            {pendingVerificationEmail && (
              <div className={styles.verificationBox}>
                <p>
                  We sent a verification link to <strong>{pendingVerificationEmail}</strong>. Open
                  the email and confirm your address to activate the account.
                </p>
                <p className={styles.verificationTip}>
                  Tip: the message sometimes lands in <strong>Spam</strong> / Junk. If you do not
                  see it within a few minutes, check that folder and mark the email as Not spam.
                </p>
                <button
                  type="button"
                  className={styles.switchModeBtn}
                  onClick={() => void handleResendVerification()}
                  disabled={isLoading}
                >
                  Resend verification email
                </button>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isSubmitDisabled}
              leftIcon={!isLoading ? <Lock size={15} /> : undefined}
              className={styles.submitBtn}
            >
              {isLoading
                ? mode === 'register'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'register'
                  ? 'Create account'
                  : 'Sign In'}
            </Button>

            {/* Switch mode */}
            <p className={styles.switchModeText}>
              {mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button type="button" className={styles.switchModeBtn} onClick={switchMode}>
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" className={styles.switchModeBtn} onClick={switchMode}>
                    Sign Up
                  </button>
                </>
              )}
            </p>
          </form>

          {/* Security strip */}
          <div className={styles.securityStrip}>
            {SECURITY_STRIP_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className={styles.securityStripItem}>
                <Icon size={10} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className={styles.disclaimer}>
          {LEGAL_NOT_INVESTMENT_ADVICE}{' '}
          <Link to={ROUTES.PRIVACY} className={styles.inlineLegalLink}>
            Privacy Policy
          </Link>
          {' · '}
          <Link to={ROUTES.TERMS} className={styles.inlineLegalLink}>
            Terms of Service
          </Link>
        </p>
      </div>
    </main>
  );
}
