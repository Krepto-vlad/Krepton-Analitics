import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Menu, X, Sun, Moon } from 'lucide-react';
import { LANDING_SCROLL_TO_FEATURES_STATE, ROUTES } from '../../../constants';
import { useTheme } from '../../../hooks/useTheme';
import styles from './Navbar.module.scss';

type ActiveRoute = 'home' | 'pricing' | 'security';

interface NavbarProps {
  activeRoute?: ActiveRoute;
}

export function Navbar({ activeRoute }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleHome = () => navigate(ROUTES.HOME, { state: null });
  const handleLogin = () => navigate(ROUTES.LOGIN);
  const handleRegister = () => navigate(ROUTES.REGISTER);
  const handlePricing = () => navigate(ROUTES.PRICING);
  const handleSecurity = () => navigate(ROUTES.SECURITY);

  const handleFeatures = () => {
    if (location.pathname === ROUTES.HOME) {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate(ROUTES.HOME, { state: LANDING_SCROLL_TO_FEATURES_STATE });
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className={styles.navbar}>
        <div
          className={styles.logo}
          onClick={handleHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleHome()}
        >
          <div className={styles.logoIcon}>
            <TrendingUp size={14} />
          </div>
          <span className={styles.logoText}>
            Krepton <span>Analytics</span>
          </span>
        </div>

        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={handleFeatures}>
            Features
          </button>
          <button
            className={`${styles.navLink} ${activeRoute === 'pricing' ? styles.active : ''}`}
            onClick={handlePricing}
          >
            Pricing
          </button>
          <button
            className={`${styles.navLink} ${activeRoute === 'security' ? styles.active : ''}`}
            onClick={handleSecurity}
          >
            Security
          </button>
        </div>

        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className={styles.btnSignIn} onClick={handleLogin}>
            Sign In
          </button>
          <button className={styles.btnGetStarted} onClick={handleRegister}>
            Get Started
          </button>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <button
            className={styles.mobileNavLink}
            onClick={() => {
              closeMobileMenu();
              handleFeatures();
            }}
          >
            Features
          </button>
          <button
            className={styles.mobileNavLink}
            onClick={() => {
              closeMobileMenu();
              handlePricing();
            }}
          >
            Pricing
          </button>
          <button
            className={styles.mobileNavLink}
            onClick={() => {
              closeMobileMenu();
              handleSecurity();
            }}
          >
            Security
          </button>
          <div className={styles.mobileDivider} />
          <div className={styles.mobileThemeRow}>
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button
            className={styles.mobileBtnSignIn}
            onClick={() => {
              closeMobileMenu();
              handleLogin();
            }}
          >
            Sign In
          </button>
          <button
            className={styles.mobileBtnGetStarted}
            onClick={() => {
              closeMobileMenu();
              handleRegister();
            }}
          >
            Get Started Free
          </button>
        </div>
      )}
    </>
  );
}
