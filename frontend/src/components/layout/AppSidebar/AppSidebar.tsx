import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  BriefcaseBusiness,
  Scale,
  BarChart3,
  FlaskConical,
  Clock,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '../../../constants';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { logoutThunk } from '../../../features/auth/authSlice';
import styles from './AppSidebar.module.scss';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, route: ROUTES.DASHBOARD },
  { label: 'Portfolio', icon: <BriefcaseBusiness size={18} />, route: ROUTES.PORTFOLIO },
  { label: 'Rebalancing', icon: <Scale size={18} />, route: ROUTES.REBALANCING },
  { label: 'Stock Matrix', icon: <BarChart3 size={18} />, route: ROUTES.SCREENER },
  { label: 'Backtesting', icon: <FlaskConical size={18} />, route: ROUTES.BACKTESTING },
  { label: 'History', icon: <Clock size={18} />, route: ROUTES.HISTORY },
];

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

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
            <TrendingUp size={14} color="#fff" />
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
        <div className={styles.userSection}>
          <div className={styles.avatar}>{user ? getInitials(user.email) : '??'}</div>
          <div className={styles.userInfo}>
            <span className={styles.userEmail}>{user?.email ?? ''}</span>
            <span className={styles.userRole}>Portfolio Manager</span>
          </div>
        </div>
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
