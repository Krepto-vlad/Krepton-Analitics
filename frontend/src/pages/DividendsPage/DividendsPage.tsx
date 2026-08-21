import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { ERROR_MESSAGES, LOADING_MESSAGES, type Currency } from '../../constants';
import { fetchPortfolioDividends } from '../../api/portfolioApi';
import { getRejectedMessage } from '../../utils/apiError';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchPortfolioSummaryThunk } from '../../features/portfolio/portfolioSlice';
import { ErrorBanner, ContentSkeleton } from '../../components/ui';
import type { DividendCalendarResponse } from '../../types/dividend.types';
import { buildLogoByTicker } from '../../utils/tickerLogos';
import { DividendSummaryCards } from './components/DividendSummaryCards/DividendSummaryCards';
import { DividendMonthlyChart } from './components/DividendMonthlyChart/DividendMonthlyChart';
import { UpcomingPaymentsList } from './components/UpcomingPaymentsList/UpcomingPaymentsList';
import styles from './DividendsPage.module.scss';

export function DividendsPage() {
  const dispatch = useAppDispatch();
  const displayCurrency = useAppSelector((state) => state.ui.currency);
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const hasHydratedSummary = useAppSelector((state) => state.portfolio.hasHydratedSummary);
  const logoByTicker = useMemo(() => buildLogoByTicker(summaryPositions), [summaryPositions]);
  const [calendarData, setCalendarData] = useState<DividendCalendarResponse | null>(null);
  const [loadedForCurrency, setLoadedForCurrency] = useState<Currency | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = loadedForCurrency !== displayCurrency;
  const showContent = calendarData !== null && loadedForCurrency === displayCurrency;

  useEffect(() => {
    if (hasHydratedSummary) {
      return;
    }

    void dispatch(fetchPortfolioSummaryThunk());
  }, [dispatch, hasHydratedSummary]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetchPortfolioDividends(displayCurrency);
        if (!cancelled) {
          setCalendarData(response);
          setLoadedForCurrency(displayCurrency);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCalendarData(null);
          setLoadedForCurrency(displayCurrency);
          setError(getRejectedMessage(loadError, ERROR_MESSAGES.DIVIDEND_CALENDAR_FAILED));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayCurrency]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <CalendarRange size={22} className={styles.titleIcon} />
            <h1 className={styles.title}>Passive Income &amp; Dividend Calendar</h1>
          </div>
          <p className={styles.subtitle}>
            Projected monthly dividend and coupon payouts for the next 12 months
          </p>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <ErrorBanner message={error} />
        </div>
      )}

      {isLoading && !showContent ? (
        <ContentSkeleton preset="page" label={LOADING_MESSAGES.DIVIDEND_CALENDAR} />
      ) : showContent ? (
        <>
          <DividendSummaryCards summary={calendarData.summary} displayCurrency={displayCurrency} />
          <DividendMonthlyChart
            chartYear={calendarData.chartYear}
            monthlyPayouts={calendarData.monthlyPayouts}
            displayCurrency={displayCurrency}
          />
          <UpcomingPaymentsList
            payments={calendarData.upcomingPayments}
            displayCurrency={displayCurrency}
            logoByTicker={logoByTicker}
          />
        </>
      ) : null}
    </div>
  );
}
