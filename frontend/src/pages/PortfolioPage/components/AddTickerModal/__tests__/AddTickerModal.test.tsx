import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { fetchStockSearch } from '../../../../../api/stockApi';
import { createWatchlistItem } from '../../../../../api/watchlistApi';
import { ERROR_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { AddTickerModal } from '../AddTickerModal';

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockSearch: jest.fn(),
  fetchStockQuotesBatch: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../../../api/watchlistApi', () => ({
  fetchWatchlistItems: jest.fn().mockResolvedValue([]),
  createWatchlistItem: jest.fn().mockResolvedValue({
    id: 'w-1',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
  deleteWatchlistItem: jest.fn(),
}));

describe('AddTickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <AddTickerModal isOpen={false} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('searches, selects, and adds a ticker', async () => {
    jest
      .mocked(fetchStockSearch)
      .mockResolvedValue([{ ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NMS', type: 'EQUITY' }]);
    const onClose = jest.fn();
    renderWithProviders(<AddTickerModal isOpen onClose={onClose} />);

    const input = screen.getByPlaceholderText('Search ticker or company…');
    await act(async () => {
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(input, { target: { value: 'AAPL' } });
      jest.advanceTimersByTime(350);
    });
    fireEvent.click(await screen.findByRole('button', { name: /AAPL/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Watchlist' }));

    await waitFor(() =>
      expect(createWatchlistItem).toHaveBeenCalledWith({
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('handles empty search, search errors, submit errors, and cancel', async () => {
    const onClose = jest.fn();
    renderWithProviders(<AddTickerModal isOpen onClose={onClose} />);

    const input = screen.getByPlaceholderText('Search ticker or company…');
    await act(async () => {
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(input, { target: { value: '   ' } });
      jest.mocked(fetchStockSearch).mockRejectedValueOnce(new Error('down'));
      fireEvent.change(input, { target: { value: 'ZZZ' } });
      jest.advanceTimersByTime(350);
    });

    jest
      .mocked(fetchStockSearch)
      .mockResolvedValueOnce([{ ticker: 'IBM', name: 'IBM', exchange: 'NYQ', type: 'EQUITY' }]);
    jest.mocked(createWatchlistItem).mockRejectedValueOnce({});
    await act(async () => {
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(input, { target: { value: 'IBM' } });
      jest.advanceTimersByTime(350);
    });
    await screen.findByRole('button', { name: /IBM/ });
    fireEvent.click(screen.getByRole('button', { name: /IBM/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Watchlist' }));
    expect(await screen.findByText(ERROR_MESSAGES.WATCHLIST_ADD_FAILED)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the header close button', async () => {
    const onClose = jest.fn();
    renderWithProviders(<AddTickerModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
