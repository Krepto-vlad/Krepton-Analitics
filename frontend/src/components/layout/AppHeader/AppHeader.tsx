import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import { ROUTES, CURRENCY_OPTIONS } from '../../../constants';
import type { Currency } from '../../../constants';
import type { Theme } from '../../../constants';
import { HeaderTickerSearch } from './HeaderTickerSearch';
import styles from './AppHeader.module.scss';

interface AppHeaderProps {
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  isSidebarExpanded: boolean;
  theme: Theme;
  onThemeToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.PORTFOLIO]: 'Portfolio',
  [ROUTES.NEWS]: 'News',
  [ROUTES.REBALANCING]: 'Rebalancing',
  [ROUTES.SCREENER]: 'Stock Matrix',
  [ROUTES.BACKTESTING]: 'Backtesting',
  [ROUTES.DIVIDENDS]: 'Dividends',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.SUBSCRIPTION]: 'Subscription',
  [ROUTES.ADMIN]: 'Admin',
  [ROUTES.LEGAL]: 'Legal Documents',
  [ROUTES.PRIVACY]: 'Privacy Policy',
  [ROUTES.TERMS]: 'Terms of Service',
};

function resolvePageTitle(pathname: string): string {
  const knownTitle = PAGE_TITLES[pathname];
  if (knownTitle) {
    return knownTitle;
  }

  const tickerMatch = matchPath(ROUTES.TICKER, pathname);
  const ticker = tickerMatch?.params.ticker;
  if (ticker) {
    return ticker.toUpperCase();
  }

  return 'Krepton Analytics';
}

export function AppHeader({
  currency,
  onCurrencyChange,
  isSidebarExpanded,
  theme,
  onThemeToggle,
}: AppHeaderProps) {
  const location = useLocation();
  const [hasUnreadNotifications] = useState(false);

  const pageTitle = resolvePageTitle(location.pathname);

  return (
    <header className={`${styles.header} ${isSidebarExpanded ? styles.sidebarExpanded : ''}`}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        <span className={styles.liveBadge}>LIVE</span>
      </div>

      <div className={styles.center}>
        <HeaderTickerSearch />
      </div>

      <div className={styles.right}>
        <div className={styles.currencySwitcher}>
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.currencyButton} ${currency === option ? styles.activeCurrency : ''}`}
              onClick={() => onCurrencyChange(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.iconButton}
          onClick={onThemeToggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          type="button"
          className={`${styles.iconButton} ${styles.notificationsButton}`}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {hasUnreadNotifications && <span className={styles.notificationDot} />}
        </button>

        <span className={styles.dateLabel}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </header>
  );
}
