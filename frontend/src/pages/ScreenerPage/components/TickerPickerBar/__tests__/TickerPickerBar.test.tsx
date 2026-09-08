import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockSearch } from '../../../../../api/stockApi';
import { STOCK_COMPARE_MAX_TICKERS } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { WatchlistItem } from '../../../../../types/watchlist.types';
import { TickerPickerBar } from '../TickerPickerBar';

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockSearch: jest.fn(),
}));

const watchlist: WatchlistItem[] = [
  {
    id: 'w-1',
    ticker: 'MSFT',
    companyName: 'Microsoft',
    price: 400,
    changePercent: 1,
    currency: 'USD',
    fiftyTwoWeekHigh: 450,
    fiftyTwoWeekLow: 300,
    logoUrl: null,
  },
];

describe('TickerPickerBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('searches, adds from the dropdown, and removes a chip', async () => {
    jest
      .mocked(fetchStockSearch)
      .mockResolvedValue([{ ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NMS', type: 'EQUITY' }]);
    const onAddTicker = jest.fn();
    const onRemoveTicker = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderWithProviders(
      <TickerPickerBar
        selectedTickers={[{ ticker: 'NVDA', name: 'NVIDIA' }]}
        watchlistItems={watchlist}
        onAddTicker={onAddTicker}
        onRemoveTicker={onRemoveTicker}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove NVDA' }));
    expect(onRemoveTicker).toHaveBeenCalledWith('NVDA');

    const input = screen.getByPlaceholderText('Add ticker…');
    await user.type(input, 'AA');
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await screen.findByText('Apple Inc.');
    await user.click(screen.getByRole('button', { name: /AAPL/ }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'AAPL', name: 'Apple Inc.' });
  });

  it('adds from watchlist suggestions and the first search result', async () => {
    jest
      .mocked(fetchStockSearch)
      .mockResolvedValue([{ ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NMS', type: 'EQUITY' }]);
    const onAddTicker = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderWithProviders(
      <TickerPickerBar
        selectedTickers={[]}
        watchlistItems={watchlist}
        onAddTicker={onAddTicker}
        onRemoveTicker={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /\$MSFT/ }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'MSFT', name: 'Microsoft' });

    const input = screen.getByPlaceholderText('Add ticker…');
    await user.type(input, 'AAPL');
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(fetchStockSearch).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Add selected ticker' }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'AAPL', name: 'Apple Inc.' });
  });

  it('adds on Enter, ignores empty/error searches, and blocks at the max', async () => {
    const onAddTicker = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const selectedTickers = Array.from({ length: STOCK_COMPARE_MAX_TICKERS }, (_, index) => ({
      ticker: `T${index}`,
      name: `Ticker ${index}`,
    }));

    const { rerender } = renderWithProviders(
      <TickerPickerBar
        selectedTickers={[]}
        watchlistItems={[]}
        onAddTicker={onAddTicker}
        onRemoveTicker={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Add ticker…');
    await user.type(input, '   ');
    jest.mocked(fetchStockSearch).mockRejectedValueOnce(new Error('down'));
    await user.type(input, 'ZZ');
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    jest
      .mocked(fetchStockSearch)
      .mockResolvedValueOnce([{ ticker: 'IBM', name: 'IBM', exchange: 'NYQ', type: 'EQUITY' }]);
    await user.clear(input);
    await user.type(input, 'IBM');
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await screen.findByRole('button', { name: /IBM/ });
    await user.type(input, '{Enter}');
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'IBM', name: 'IBM' });

    rerender(
      <TickerPickerBar
        selectedTickers={selectedTickers}
        watchlistItems={watchlist}
        onAddTicker={onAddTicker}
        onRemoveTicker={jest.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Maximum tickers reached')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add selected ticker' })).toBeDisabled();
  });
});
