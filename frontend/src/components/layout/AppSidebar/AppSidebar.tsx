import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  BriefcaseBusiness,
  Scale,
  BarChart3,
  FlaskConical,
  CalendarRange,
  Newspaper,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '../../../constants';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { logoutThunk } from '../../../features/auth/authSlice';
import { getEmailInitials } from '../../../utils/emailDisplay';
import styles from './AppSidebar.module.scss';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, route: ROUTES.DASHBOARD },
  { label: 'Portfolio', icon: <BriefcaseBusiness size={18} />, route: ROUTES.PORTFOLIO },
  { label: 'News', icon: <Newspaper size={18} />, route: ROUTES.NEWS },
  { label: 'Rebalancing', icon: <Scale size={18} />, route: ROUTES.REBALANCING },
  { label: 'Stock Matrix', icon: <BarChart3 size={18} />, route: ROUTES.SCREENER },
  { label: 'Backtesting', icon: <FlaskConical size={18} />, route: ROUTES.BACKTESTING },
  { label: 'Dividend Calendar', icon: <CalendarRange size={18} />, route: ROUTES.DIVIDENDS },
];

interface AppSidebarProps {
  onExpandedChange: (expanded: boolean) => void;
}

export function AppSidebar({ onExpandedChange }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutThunk()).then(() => navigate(ROUTES.LOGIN));
  };

  return (
    <aside
      className={styles.sidebar}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      <div className={styles.top}>
        <div
          className={styles.logo}
          onClick={() => navigate(ROUTES.DASHBOARD)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(ROUTES.DASHBOARD)}
        >
          <div className={styles.logoIcon}>
            <TrendingUp size={14} aria-hidden="true" />
          </div>
          <span className={styles.logoText}>
            Krepton <span>Analytics</span>
          </span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.route;
          return (
            <button
              key={item.route}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => navigate(item.route)}
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && <span className={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <button
          type="button"
          className={styles.userSection}
          onClick={() => navigate(ROUTES.PROFILE)}
          title="My Profile"
          aria-label="Open profile"
        >
          <div className={styles.avatar}>{user ? getEmailInitials(user.email) : '??'}</div>
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user?.email ?? ''}</span>
            <span className={styles.userHint}>My Profile</span>
          </div>
        </button>
        <button
          className={styles.logoutButton}
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
