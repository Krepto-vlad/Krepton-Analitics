import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarRange,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Newspaper,
  Scale,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROUTES } from '../../../constants';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { logoutThunk } from '../../../features/auth/authSlice';
import styles from './AppBottomNav.module.scss';

interface BottomNavItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

const PRIMARY_ITEMS: readonly BottomNavItem[] = [
  { label: 'Dashboard', route: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Portfolio', route: ROUTES.PORTFOLIO, icon: BriefcaseBusiness },
  { label: 'News', route: ROUTES.NEWS, icon: Newspaper },
];

const MORE_ITEMS: readonly BottomNavItem[] = [
  { label: 'Rebalancing', route: ROUTES.REBALANCING, icon: Scale },
  { label: 'Stock Matrix', route: ROUTES.SCREENER, icon: BarChart3 },
  { label: 'Backtesting', route: ROUTES.BACKTESTING, icon: FlaskConical },
  { label: 'Dividend Calendar', route: ROUTES.DIVIDENDS, icon: CalendarRange },
  { label: 'Profile', route: ROUTES.PROFILE, icon: UserRound },
  { label: 'Subscription', route: ROUTES.SUBSCRIPTION, icon: CreditCard },
];

const MORE_MENU_LABEL = 'More pages';
const ICON_SIZE_PX = 20;

export function AppBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sheetTitleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [moreMenuPath, setMoreMenuPath] = useState<string | null>(null);
  const isMoreOpen = moreMenuPath === location.pathname;

  const isMoreRouteActive = MORE_ITEMS.some((item) => item.route === location.pathname);

  function closeMoreMenu(): void {
    setMoreMenuPath(null);
  }

  function toggleMoreMenu(): void {
    setMoreMenuPath((currentPath) =>
      currentPath === location.pathname ? null : location.pathname
    );
  }

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    sheetRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMoreMenuPath(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMoreOpen]);

  function handleLogout(): void {
    closeMoreMenu();
    void dispatch(logoutThunk()).then(() => navigate(ROUTES.LOGIN));
  }

  return (
    <>
      {isMoreOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close more pages"
          onClick={closeMoreMenu}
        />
      ) : null}

      {isMoreOpen ? (
        <div
          ref={sheetRef}
          id={sheetTitleId}
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={MORE_MENU_LABEL}
          tabIndex={-1}
        >
          <p className={styles.sheetTitle}>{MORE_MENU_LABEL}</p>
          <ul className={styles.sheetList}>
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.route;
              return (
                <li key={item.route}>
                  <NavLink
                    to={item.route}
                    className={`${styles.sheetLink} ${isActive ? styles.sheetLinkActive : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={closeMoreMenu}
                  >
                    <Icon size={ICON_SIZE_PX} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={ICON_SIZE_PX} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      ) : null}

      <nav className={`${styles.bar} ${isMoreOpen ? styles.barRaised : ''}`} aria-label="Primary">
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.route}
              to={item.route}
              end
              className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
            >
              <Icon size={ICON_SIZE_PX} aria-hidden="true" />
              <span className={styles.tabLabel}>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`${styles.tab} ${isMoreRouteActive ? styles.tabActive : ''}`}
          aria-expanded={isMoreOpen}
          aria-controls={isMoreOpen ? sheetTitleId : undefined}
          aria-current={isMoreRouteActive ? 'page' : undefined}
          onClick={toggleMoreMenu}
        >
          <MoreHorizontal size={ICON_SIZE_PX} aria-hidden="true" />
          <span className={styles.tabLabel}>More</span>
        </button>
      </nav>
    </>
  );
}
