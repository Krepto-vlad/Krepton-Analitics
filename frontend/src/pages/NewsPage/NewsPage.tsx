import { useEffect, useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import {
  NEWS_PAGE_INITIAL_VISIBLE,
  NEWS_PAGE_LOAD_MORE_STEP,
  BEGINNER_TUTORIAL_ANCHORS,
  TICKER_CHAT_SCREEN_NEWS_KIND,
} from '../../constants';
import {
  loadChatScreenContext,
  saveChatScreenContext,
  saveNewsChatScreen,
} from '../../utils/tickerChatSession';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  fetchPortfolioNewsThunk,
  fetchPortfolioSummaryThunk,
} from '../../features/portfolio/portfolioSlice';
import { buildLogoByTicker } from '../../utils/tickerLogos';
import { isIncludedInPortfolioAnalysis } from '../../utils/portfolioAnalysisScope';
import { NewsFeed } from '../DashboardPage/components/NewsFeed/NewsFeed';
import { NewsSummaryPanel } from './components/NewsSummaryPanel/NewsSummaryPanel';
import styles from './NewsPage.module.scss';

export function NewsPage() {
  const dispatch = useAppDispatch();
  const summaryPositions = useAppSelector((state) => state.portfolio.summaryPositions);
  const hasHydratedSummary = useAppSelector((state) => state.portfolio.hasHydratedSummary);
  const hasHydratedNews = useAppSelector((state) => state.portfolio.hasHydratedNews);
  const news = useAppSelector((state) => state.portfolio.news);
  const isLoadingNews = useAppSelector((state) => state.portfolio.isLoadingNews);
  const newsError = useAppSelector((state) => state.portfolio.newsError);

  const analyzedPositions = useMemo(
    () => summaryPositions.filter(isIncludedInPortfolioAnalysis),
    [summaryPositions]
  );

  const holdingsTickerKey = useMemo(
    () =>
      analyzedPositions
        .map((position) => position.ticker)
        .sort()
        .join(','),
    [analyzedPositions]
  );

  const newsLogoByTicker = useMemo(() => buildLogoByTicker(analyzedPositions), [analyzedPositions]);
  const hasPortfolioHoldings = analyzedPositions.length > 0;
  const isHoldingsLoading = !hasHydratedSummary;
  const isNewsFeedLoading =
    isHoldingsLoading || isLoadingNews || (hasPortfolioHoldings && !hasHydratedNews);

  useEffect(() => {
    if (hasHydratedSummary) {
      return;
    }

    void dispatch(fetchPortfolioSummaryThunk());
  }, [dispatch, hasHydratedSummary]);

  useEffect(() => {
    if (holdingsTickerKey.length === 0) {
      return;
    }

    void dispatch(fetchPortfolioNewsThunk());
  }, [dispatch, holdingsTickerKey]);

  useEffect(() => {
    if (!hasHydratedSummary) {
      return;
    }

    if (analyzedPositions.length === 0) {
      saveNewsChatScreen();
      return;
    }

    if (!hasHydratedNews) {
      return;
    }

    if (newsError && loadChatScreenContext()?.kind === TICKER_CHAT_SCREEN_NEWS_KIND) {
      saveChatScreenContext(null);
      return;
    }

    if (!newsError) {
      saveNewsChatScreen();
    }
  }, [analyzedPositions.length, hasHydratedNews, hasHydratedSummary, newsError]);

  function handleRetryNews() {
    void dispatch(fetchPortfolioNewsThunk());
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Newspaper size={22} className={styles.titleIcon} />
          <h2 className={styles.title}>Portfolio News</h2>
        </div>
        <p className={styles.subtitle}>
          Headlines and AI-powered daily summaries for your holdings
        </p>
      </header>

      <div data-tutorial-anchor={BEGINNER_TUTORIAL_ANCHORS.news}>
        <NewsSummaryPanel
          key={holdingsTickerKey}
          holdings={analyzedPositions}
          holdingsKey={holdingsTickerKey}
          isHoldingsLoading={isHoldingsLoading}
        />
      </div>

      <NewsFeed
        news={news}
        isLoading={isNewsFeedLoading}
        error={newsError}
        hasPortfolioHoldings={hasPortfolioHoldings}
        onRetry={handleRetryNews}
        layout="full"
        showHeader={false}
        initialVisibleCount={NEWS_PAGE_INITIAL_VISIBLE}
        loadMoreStep={NEWS_PAGE_LOAD_MORE_STEP}
        logoByTicker={newsLogoByTicker}
      />
    </div>
  );
}
