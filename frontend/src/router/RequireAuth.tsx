import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { useAppSelector } from '../hooks/useAppSelector';
import { PageLoader } from './PageLoader';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}
