import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import { ROUTES, CURRENCY_OPTIONS } from '../../../constants';
import type { Currency } from '../../../constants';
import type { Theme } from '../../../hooks/useTheme';
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
  [ROUTES.REBALANCING]: 'Rebalancing',
  [ROUTES.SCREENER]: 'Screener',
  [ROUTES.BACKTESTING]: 'Backtesting',
  [ROUTES.WATCHLIST]: 'Watchlist',
  [ROUTES.HISTORY]: 'History',
};

export function AppHeader({
  currency,
  onCurrencyChange,
  isSidebarExpanded,
  theme,
  onThemeToggle,
}: AppHeaderProps) {
  const location = useLocation();
  const [hasUnreadNotifications] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Krepton Analytics';

  return (
    <header className={`${styles.header} ${isSidebarExpanded ? styles.sidebarExpanded : ''}`}>
      <div className={styles.left}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        <span className={styles.liveBadge}>LIVE</span>
      </div>

      <div className={styles.right}>
        <div className={styles.currencySwitcher}>
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option}
              className={`${styles.currencyButton} ${currency === option ? styles.activeCurrency : ''}`}
              onClick={() => onCurrencyChange(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          className={styles.iconButton}
          onClick={onThemeToggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className={styles.iconButton} aria-label="Notifications">
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
