import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';

// Lazy imports — each page is a separate chunk
const DashboardPage = () => <div>Dashboard — TODO</div>;
const RebalancingPage = () => <div>Rebalancing — TODO</div>;
const ScreenerPage = () => <div>Screener — TODO</div>;
const BacktestingPage = () => <div>Backtesting — TODO</div>;
const WatchlistPage = () => <div>Watchlist — TODO</div>;
const LoginPage = () => <div>Login — TODO</div>;
const RegisterPage = () => <div>Register — TODO</div>;
const NotFoundPage = () => <div>404 — Not Found</div>;

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.REBALANCING} element={<RebalancingPage />} />
        <Route path={ROUTES.SCREENER} element={<ScreenerPage />} />
        <Route path={ROUTES.BACKTESTING} element={<BacktestingPage />} />
        <Route path={ROUTES.WATCHLIST} element={<WatchlistPage />} />
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
