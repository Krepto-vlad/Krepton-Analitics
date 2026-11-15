import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { loadChatScreenContext, saveNewsChatScreen } from '../../../utils/tickerChatSession';
import { NewsPage } from '../NewsPage';

jest.mock('../components/NewsSummaryPanel/NewsSummaryPanel', () => ({
  NewsSummaryPanel: () => <div>Summary panel</div>,
}));

jest.mock('../../DashboardPage/components/NewsFeed/NewsFeed', () => ({
  NewsFeed: () => <div>News feed</div>,
}));

describe('NewsPage chat screen', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves an empty headline screen when the portfolio has no holdings', async () => {
    renderWithProviders(<NewsPage />, {
      preloadedState: {
        portfolio: {
          summaryPositions: [],
          hasHydratedSummary: true,
          hasHydratedNews: false,
          news: [],
          isLoadingNews: false,
          newsError: null,
        } as never,
      },
    });

    expect(await screen.findByText('News feed')).toBeInTheDocument();
    await waitFor(() => {
      expect(loadChatScreenContext()).toEqual({ kind: 'news' });
    });
  });

  it('clears the headline screen when headlines fail to load', async () => {
    saveNewsChatScreen();
    renderWithProviders(<NewsPage />, {
      preloadedState: {
        portfolio: {
          summaryPositions: [{ ticker: 'AAPL' }],
          hasHydratedSummary: true,
          hasHydratedNews: true,
          news: [],
          isLoadingNews: false,
          newsError: 'Unable to load news.',
        } as never,
      },
    });

    await waitFor(() => {
      expect(loadChatScreenContext()).toBeNull();
    });
  });
});
