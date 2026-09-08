import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchLiveFxRates } from '../../../../../api/fxApi';
import { deleteWatchlistItem, fetchWatchlistItems } from '../../../../../api/watchlistApi';
import { LOADING_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { WatchlistItem } from '../../../../../types/watchlist.types';
import { WatchlistPanel } from '../WatchlistPanel';

jest.mock('../../../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn().mockResolvedValue({ USD: 1, EUR: 0.9 }),
}));

jest.mock('../../../../../api/watchlistApi', () => ({
  fetchWatchlistItems: jest.fn().mockResolvedValue([]),
  createWatchlistItem: jest.fn(),
  deleteWatchlistItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../AddTickerModal/AddTickerModal', () => ({
  AddTickerModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Add ticker modal</div> : null,
}));

const apple: WatchlistItem = {
  id: 'w-1',
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  price: 150,
  changePercent: 1.25,
  currency: 'USD',
  fiftyTwoWeekHigh: 200,
  fiftyTwoWeekLow: 100,
  logoUrl: null,
};

const sap: WatchlistItem = {
  id: 'w-2',
  ticker: 'SAP',
  companyName: 'SAP SE',
  price: 180,
  changePercent: -0.5,
  currency: 'EUR',
  fiftyTwoWeekHigh: null,
  fiftyTwoWeekLow: null,
  logoUrl: null,
};

const watchlistState = {
  items: [apple, sap],
  isLoading: false,
  hasHydrated: true,
  isSubmitting: false,
  error: null as string | null,
};

describe('WatchlistPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading panel when hydrating an empty list', () => {
    renderWithProviders(<WatchlistPanel />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: true,
          hasHydrated: false,
          isSubmitting: false,
          error: null,
        },
      },
    });

    expect(screen.getByRole('status', { name: LOADING_MESSAGES.WATCHLIST })).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPanel />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: 'Unable to load watchlist',
        },
      },
    });

    expect(screen.getByRole('heading', { name: 'Unable to load watchlist' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetchWatchlistItems).toHaveBeenCalled());
  });

  it('renders the empty state and opens the add modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPanel />, {
      preloadedState: {
        watchlist: {
          items: [],
          isLoading: false,
          hasHydrated: true,
          isSubmitting: false,
          error: null,
        },
      },
    });

    expect(screen.getByText('Watchlist is empty')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Add Ticker' })[0]);
    expect(screen.getByText('Add ticker modal')).toBeInTheDocument();
  });

  it('lists items, filters, converts FX, and deletes a row', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPanel />, {
      preloadedState: { watchlist: watchlistState },
    });

    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('SAP SE')).toBeInTheDocument();
    expect(screen.getByText('2 tickers')).toBeInTheDocument();
    await waitFor(() => expect(fetchLiveFxRates).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText('Search...'), 'zzz');
    expect(screen.getByText('No matching tickers')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search...'));
    await user.type(screen.getByPlaceholderText('Search...'), 'apple');
    expect(screen.getByText('1 ticker')).toBeInTheDocument();

    await user.click(screen.getByTitle('Remove from watchlist'));
    await waitFor(() => expect(deleteWatchlistItem).toHaveBeenCalledWith('w-1'));
  });

  it('shows an inline error when items are already loaded', () => {
    renderWithProviders(<WatchlistPanel />, {
      preloadedState: {
        watchlist: { ...watchlistState, error: 'Stale refresh failed' },
      },
    });

    expect(screen.getByText('Stale refresh failed')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });
});
