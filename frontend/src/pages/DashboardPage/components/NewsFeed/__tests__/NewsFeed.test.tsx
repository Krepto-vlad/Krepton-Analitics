import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewsItem } from '../../../../../types/portfolio.types';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { NewsFeed } from '../NewsFeed';

const news: NewsItem[] = [
  {
    id: 'n1',
    tickers: ['AAPL'],
    source: 'Reuters',
    timeAgo: '1h',
    headline: 'Apple rises',
    url: 'https://example.com/a',
  },
  {
    id: 'n2',
    tickers: ['MSFT'],
    source: 'Bloomberg',
    timeAgo: '2h',
    headline: 'Microsoft news',
    url: 'https://example.com/b',
  },
];

describe('NewsFeed', () => {
  it('asks the user to add holdings when the portfolio is empty', () => {
    renderWithProviders(<NewsFeed news={[]} hasPortfolioHoldings={false} />);
    expect(screen.getByText('No holdings yet')).toBeInTheDocument();
  });

  it('loads more headlines for a portfolio with news', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NewsFeed news={news} hasPortfolioHoldings initialVisibleCount={1} loadMoreStep={1} />
    );

    expect(screen.getByText('Apple rises')).toBeInTheDocument();
    expect(screen.queryByText('Microsoft news')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Load more/i }));
    expect(screen.getByText('Microsoft news')).toBeInTheDocument();
  });
});
