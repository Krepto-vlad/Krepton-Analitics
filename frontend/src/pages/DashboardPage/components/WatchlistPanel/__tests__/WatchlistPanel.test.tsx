import { screen } from '@testing-library/react';
import { fetchLiveFxRates } from '../../../../../api/fxApi';
import type { WatchlistItem } from '../../../../../types/watchlist.types';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { WatchlistPanel } from '../WatchlistPanel';

jest.mock('../../../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn(),
}));

const item: WatchlistItem = {
  id: 'w1',
  ticker: 'AAPL',
  companyName: 'Apple',
  price: 150,
  changePercent: 1.5,
  currency: 'USD',
  fiftyTwoWeekHigh: 200,
  fiftyTwoWeekLow: 100,
  logoUrl: null,
};

describe('Dashboard WatchlistPanel', () => {
  it('shows the empty state', () => {
    jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
    renderWithProviders(<WatchlistPanel watchlist={[]} currency="USD" />);
    expect(screen.getByRole('heading', { name: 'Watchlist is empty' })).toBeInTheDocument();
  });

  it('renders live prices for watched tickers', async () => {
    jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
    renderWithProviders(<WatchlistPanel watchlist={[item]} currency="USD" />);
    expect(await screen.findByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('+1.50%')).toBeInTheDocument();
  });
});
