import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCurrentUserThunk } from '../features/auth/authSlice';

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

// Protected app pages — stubs until implemented
const DashboardPage = () => <div style={{ color: '#fff', padding: 40 }}>Dashboard — TODO</div>;
const RebalancingPage = () => <div style={{ color: '#fff', padding: 40 }}>Rebalancing — TODO</div>;
const ScreenerPage = () => <div style={{ color: '#fff', padding: 40 }}>Screener — TODO</div>;
const BacktestingPage = () => <div style={{ color: '#fff', padding: 40 }}>Backtesting — TODO</div>;
const WatchlistPage = () => <div style={{ color: '#fff', padding: 40 }}>Watchlist — TODO</div>;
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

interface ProtectedRouteProps {
  element: React.ReactElement;
}

function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { user, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) return <PageLoader />;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;

  return element;
}

function AppRoutes() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUserThunk());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<LandingPage />} />
        <Route path={ROUTES.PRICING} element={<PricingPage />} />
        <Route path={ROUTES.SECURITY} element={<SecurityPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute element={<DashboardPage />} />} />
        <Route
          path={ROUTES.REBALANCING}
          element={<ProtectedRoute element={<RebalancingPage />} />}
        />
        <Route path={ROUTES.SCREENER} element={<ProtectedRoute element={<ScreenerPage />} />} />
        <Route
          path={ROUTES.BACKTESTING}
          element={<ProtectedRoute element={<BacktestingPage />} />}
        />
        <Route path={ROUTES.WATCHLIST} element={<ProtectedRoute element={<WatchlistPage />} />} />
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
