import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
const LegalDocumentsPage = lazy(() =>
  import('../pages/LegalPage/LegalDocumentsPage').then((m) => ({ default: m.LegalDocumentsPage }))
);
const LegalPdfViewerPage = lazy(() =>
  import('../pages/LegalPage/LegalPdfViewerPage').then((m) => ({ default: m.LegalPdfViewerPage }))
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
const RebalancingPage = lazy(() =>
  import('../pages/RebalancingPage/RebalancingPage').then((m) => ({ default: m.RebalancingPage }))
);
const ScreenerPage = lazy(() =>
  import('../pages/ScreenerPage/ScreenerPage').then((m) => ({ default: m.ScreenerPage }))
);
const BacktestingPage = lazy(() =>
  import('../pages/BacktestingPage/BacktestingPage').then((m) => ({ default: m.BacktestingPage }))
);
const DividendsPage = lazy(() =>
  import('../pages/DividendsPage/DividendsPage').then((m) => ({ default: m.DividendsPage }))
);
const NewsPage = lazy(() =>
  import('../pages/NewsPage/NewsPage').then((m) => ({ default: m.NewsPage }))
);
const TickerDetailPage = lazy(() =>
  import('../pages/TickerDetailPage/TickerDetailPage').then((m) => ({
    default: m.TickerDetailPage,
  }))
);
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SubscriptionPage = lazy(() =>
  import('../pages/SubscriptionPage/SubscriptionPage').then((m) => ({
    default: m.SubscriptionPage,
  }))
);
const VerifyEmailPage = lazy(() =>
  import('../pages/VerifyEmailPage/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import('../pages/ResetPasswordPage/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const WatchlistPage = () => (
  <div style={{ color: '#fff', padding: 40 }}>Watchlist — coming soon</div>
);
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

/** Scroll to top on route change. Landing handles its own scroll (Features deep-link). */
function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === ROUTES.HOME) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUserThunk());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTopOnNavigate />
      <Routes>
        {/* Public marketing pages */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.PRICING} element={<PricingPage />} />
        <Route path={ROUTES.SECURITY} element={<SecurityPage />} />
        <Route path={ROUTES.LEGAL} element={<LegalDocumentsPage />} />
        <Route path={ROUTES.LEGAL_DOCUMENT} element={<LegalPdfViewerPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

        {/* Protected app — single AppShell, only content changes on navigation */}
        <Route element={<ProtectedLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PORTFOLIO} element={<PortfolioPage />} />
          <Route path={ROUTES.REBALANCING} element={<RebalancingPage />} />
          <Route path={ROUTES.SCREENER} element={<ScreenerPage />} />
          <Route path={ROUTES.BACKTESTING} element={<BacktestingPage />} />
          <Route path={ROUTES.DIVIDENDS} element={<DividendsPage />} />
          <Route path={ROUTES.NEWS} element={<NewsPage />} />
          <Route path={ROUTES.TICKER} element={<TickerDetailPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.SUBSCRIPTION} element={<SubscriptionPage />} />
          <Route path={ROUTES.WATCHLIST} element={<WatchlistPage />} />
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
