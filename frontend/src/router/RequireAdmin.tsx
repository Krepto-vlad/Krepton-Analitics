import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { useAppSelector } from '../hooks/useAppSelector';
import { PageLoader } from './PageLoader';

interface RequireAdminProps {
  children: ReactNode;
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return children;
}
