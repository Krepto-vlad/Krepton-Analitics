import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCurrentUserThunk } from '../features/auth/authSlice';
import { useWatchlistPolling } from '../hooks/useWatchlistPolling';
import { useHoldingsPolling } from '../hooks/useHoldingsPolling';
import { AppShell } from '../components/layout';

const LandingPage = lazy(() =>
  import('../pages/LandingPage/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const PricingPage = lazy(() =>
  import('../pages/PricingPage/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const SecurityPage = lazy(() =>
  import('../pages/SecurityPage/SecurityPage').then((m) => ({ default: m.SecurityPage }))
);
const LoginPage = lazy(() =>
  import('../pages/AuthPage/AuthPage').then((m) => ({
    default: () => <m.AuthPage initialMode="login" />,
  }))
);
const RegisterPage = lazy(() =>
  import('../pages/AuthPage/AuthPage').then((m) => ({
    default: () => <m.AuthPage initialMode="register" />,
  }))
);

const DashboardPage = lazy(() =>
  import('../pages/DashboardPage/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const PortfolioPage = lazy(() =>
  import('../pages/PortfolioPage/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
);
const RebalancingPage = () => (
  <div style={{ color: '#fff', padding: 40 }}>Rebalancing — coming soon</div>
);
const ScreenerPage = lazy(() =>
  import('../pages/ScreenerPage/ScreenerPage').then((m) => ({ default: m.ScreenerPage }))
);
const BacktestingPage = lazy(() =>
  import('../pages/BacktestingPage/BacktestingPage').then((m) => ({ default: m.BacktestingPage }))
);
const WatchlistPage = () => (
  <div style={{ color: '#fff', padding: 40 }}>Watchlist — coming soon</div>
);
const HistoryPage = () => <div style={{ color: '#fff', padding: 40 }}>History — coming soon</div>;
const NotFoundPage = () => <div style={{ color: '#fff', padding: 40 }}>404 — Not Found</div>;

function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}

function AuthenticatedShell() {
  useWatchlistPolling();
  useHoldingsPolling();

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// Single AppShell instance for all protected pages — sidebar state persists across navigation
function ProtectedLayout() {
  const { user, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) return <PageLoader />;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  return <AuthenticatedShell />;
}

function AppRoutes() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUserThunk());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public marketing pages */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.PRICING} element={<PricingPage />} />
        <Route path={ROUTES.SECURITY} element={<SecurityPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

        {/* Protected app — single AppShell, only content changes on navigation */}
        <Route element={<ProtectedLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PORTFOLIO} element={<PortfolioPage />} />
          <Route path={ROUTES.REBALANCING} element={<RebalancingPage />} />
          <Route path={ROUTES.SCREENER} element={<ScreenerPage />} />
          <Route path={ROUTES.BACKTESTING} element={<BacktestingPage />} />
          <Route path={ROUTES.WATCHLIST} element={<WatchlistPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
