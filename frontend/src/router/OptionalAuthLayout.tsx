import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/layout';
import { fetchCurrentUserThunk } from '../features/auth/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { PageLoader } from './PageLoader';

/**
 * Public legal URLs stay crawlable, but a signed-in session keeps the app chrome
 * so users are not dropped onto the marketing navbar (and forced to sign in again).
 */
export function OptionalAuthLayout() {
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

  if (user) {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  }

  return <Outlet />;
}
