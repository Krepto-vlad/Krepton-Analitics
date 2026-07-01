import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  TrendingUp,
  Shield,
  ArrowLeft,
  Lock,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ROUTES } from '../../constants';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { registerThunk, loginThunk, clearAuthError } from '../../features/auth/authSlice';
import styles from './AuthPage.module.scss';

type AuthMode = 'login' | 'register';

interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'One number (0–9)', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'One special character (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  return PASSWORD_RULES.filter((rule) => rule.test(password)).length;
}

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
  const { isLoading, error, user } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [user, navigate]);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [mode, dispatch]);

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

  const switchMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setNickname('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreed(false);
  };

  const isSubmitDisabled = isLoading || (mode === 'register' && !isRegisterReady);

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.grid} />

      <button className={styles.backButton} onClick={() => navigate(ROUTES.HOME)}>
        <ArrowLeft size={15} />
        Back to home
      </button>

      <div className={styles.content}>
        <div className={styles.logoMark}>
          <div className={styles.logoIcon}>
            <TrendingUp size={16} color="#fff" />
          </div>
          <span className={styles.logoText}>
            Krepton <span>Analytics</span>
          </span>
        </div>

        {/* ── Mode tabs ── */}
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => mode !== 'register' && switchMode()}
          >
            Sign Up
          </button>
          <button
            className={`${styles.modeTab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => mode !== 'login' && switchMode()}
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
                ? 'No KYC, no names. Just a nickname and password.'
                : 'Sign in to access your portfolio analytics.'}
            </p>
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
              label={mode === 'register' ? 'Email Address' : 'Email or Nickname'}
              type="email"
              placeholder={mode === 'register' ? 'name@example.com' : 'your@email.com'}
              value={email}
              onChange={setEmail}
              autoComplete="off"
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

              {/* Strength bar */}
              {password.length > 0 && (
                <div className={styles.strengthRow}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={styles.strengthBar}
                        style={{
                          background:
                            i <= passwordStrength
                              ? STRENGTH_COLORS[passwordStrength]
                              : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className={styles.strengthLabel}
                    style={{ color: STRENGTH_COLORS[passwordStrength] }}
                  >
                    {STRENGTH_LABELS[passwordStrength]}
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
                    return (
                      <div
                        key={rule.id}
                        className={styles.passwordRule}
                        style={{
                          color: passed
                            ? 'rgba(255,255,255,0.65)'
                            : touched
                              ? 'rgba(239,68,68,0.7)'
                              : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <div
                          className={styles.passwordRuleIcon}
                          style={{
                            background: passed
                              ? 'rgba(16,185,129,0.2)'
                              : touched
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${
                              passed
                                ? 'rgba(16,185,129,0.5)'
                                : touched
                                  ? 'rgba(239,68,68,0.4)'
                                  : 'rgba(255,255,255,0.1)'
                            }`,
                          }}
                        >
                          {passed && <Check size={8} color="#10B981" />}
                          {!passed && touched && (
                            <span
                              style={{ fontSize: '0.45rem', color: '#EF4444', fontWeight: 700 }}
                            >
                              ✕
                            </span>
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
                      <Check size={14} color="#10B981" />
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>
                        ✕
                      </span>
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
                <Shield size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                <p>
                  <strong>Privacy Protection Active:</strong> Real names or phone numbers are
                  strictly prohibited. Your identity is never linked to your financial data.
                </p>
              </div>
            )}

            {/* Agreement (register only) */}
            {mode === 'register' && (
              <div
                className={styles.agreement}
                onClick={() => setAgreed((v) => !v)}
                role="checkbox"
                aria-checked={agreed}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setAgreed((v) => !v)}
              >
                <div
                  className={styles.checkbox}
                  style={{
                    background: agreed ? '#10B981' : 'transparent',
                    border: agreed ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {agreed && <Check size={10} color="#fff" />}
                </div>
                <span className={styles.agreementText}>
                  I understand that Krepton does not collect personal data and insights are for
                  educational purposes only.
                </span>
              </div>
            )}

            {/* Forgot password (login only) */}
            {mode === 'login' && (
              <div className={styles.forgotPassword}>
                <button type="button" className={styles.forgotPasswordBtn}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={13} />
                {error}
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
                  ? 'Launch Dashboard'
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
          By continuing, you acknowledge that Krepton provides analytical tools for educational
          purposes only and does not constitute formal financial advice.
        </p>
      </div>
    </div>
  );
}
