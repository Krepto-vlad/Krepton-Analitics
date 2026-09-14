import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Menu, X, Sun, Moon } from 'lucide-react';
import { LANDING_SCROLL_TO_FEATURES_STATE, ROUTES } from '../../../constants';
import { useAppSelector } from '../../../hooks/useAppSelector';
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
  const isAuthenticated = Boolean(useAppSelector((state) => state.auth.user));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const homeRoute = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME;

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
        <Link to={homeRoute} state={null} className={styles.logo}>
          <div className={styles.logoIcon}>
            <TrendingUp size={14} />
          </div>
          <span className={styles.logoText}>
            Krepton <span>Analytics</span>
          </span>
        </Link>

        <div className={styles.navLinks}>
          <button className={styles.navLink} onClick={handleFeatures}>
            Features
          </button>
          <Link
            to={ROUTES.PRICING}
            className={`${styles.navLink} ${activeRoute === 'pricing' ? styles.active : ''}`}
          >
            Pricing
          </Link>
          <Link
            to={ROUTES.SECURITY}
            className={`${styles.navLink} ${activeRoute === 'security' ? styles.active : ''}`}
          >
            Security
          </Link>
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
          {isAuthenticated ? (
            <Link to={ROUTES.DASHBOARD} className={styles.btnGetStarted}>
              Open app
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className={styles.btnSignIn}>
                Sign In
              </Link>
              <Link to={ROUTES.REGISTER} className={styles.btnGetStarted}>
                Get Started
              </Link>
            </>
          )}
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
          <Link to={ROUTES.PRICING} className={styles.mobileNavLink} onClick={closeMobileMenu}>
            Pricing
          </Link>
          <Link to={ROUTES.SECURITY} className={styles.mobileNavLink} onClick={closeMobileMenu}>
            Security
          </Link>
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
          {isAuthenticated ? (
            <Link
              to={ROUTES.DASHBOARD}
              className={styles.mobileBtnGetStarted}
              onClick={closeMobileMenu}
            >
              Open app
            </Link>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className={styles.mobileBtnSignIn} onClick={closeMobileMenu}>
                Sign In
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className={styles.mobileBtnGetStarted}
                onClick={closeMobileMenu}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
