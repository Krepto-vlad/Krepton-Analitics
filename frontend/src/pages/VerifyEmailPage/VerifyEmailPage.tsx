import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { ROUTES } from '../../constants';
import { PAGE_SEO_METADATA } from '../../constants/seo';
import { ErrorBanner } from '../../components/ui';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageSeo } from '../../hooks/usePageSeo';
import { verifyEmailThunk } from '../../features/auth/authSlice';
import styles from './VerifyEmailPage.module.scss';

export function VerifyEmailPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { isLoading, error, user } = useAppSelector((state) => state.auth);
  const hasRequestedRef = useRef(false);

  usePageSeo(PAGE_SEO_METADATA[ROUTES.VERIFY_EMAIL]);

  useEffect(() => {
    if (!token || hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;
    void dispatch(verifyEmailThunk(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (user) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, navigate]);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <MailCheck size={28} className={styles.icon} />
        <h1 className={styles.title}>Email verification</h1>

        {!token && (
          <>
            <p className={styles.text}>This verification link is missing a token.</p>
            <Link to={ROUTES.LOGIN} className={styles.link}>
              Back to sign in
            </Link>
          </>
        )}

        {token && isLoading && (
          <p className={styles.text}>
            <Loader2 size={16} className={styles.spinner} />
            Verifying your email…
          </p>
        )}

        {token && error && (
          <>
            <ErrorBanner message={error} />
            <Link to={ROUTES.LOGIN} className={styles.link}>
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
