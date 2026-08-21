import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { fetchCurrentUserThunk } from '../features/auth/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { PageLoader } from './PageLoader';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const dispatch = useAppDispatch();
  const { user, isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    void dispatch(fetchCurrentUserThunk());
  }, [dispatch, isInitialized]);

  if (!isInitialized) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}
