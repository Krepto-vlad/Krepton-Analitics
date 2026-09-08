import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockSearch } from '../../../../../api/stockApi';
import { BACKTEST_DEFAULT_AMOUNT, BACKTEST_MAX_TICKERS } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { WatchlistItem } from '../../../../../types/watchlist.types';
import { BacktestInputPanel } from '../BacktestInputPanel';

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

const defaultProps = {
  selectedTickers: [] as Array<{ ticker: string; name: string; weightPercent: number }>,
  watchlistItems: watchlist,
  period: '3y' as const,
  amount: BACKTEST_DEFAULT_AMOUNT,
  displayCurrency: 'USD' as const,
  isCalculating: false,
  canLoadFromPortfolio: true,
  onAddTicker: jest.fn(),
  onRemoveTicker: jest.fn(),
  onWeightChange: jest.fn(),
  onLoadFromPortfolio: jest.fn(),
  onPeriodChange: jest.fn(),
  onAmountChange: jest.fn(),
  onCalculate: jest.fn(),
};

describe('BacktestInputPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('searches and adds a ticker, then calculates when weights are valid', async () => {
    jest
      .mocked(fetchStockSearch)
      .mockResolvedValue([{ ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NMS', type: 'EQUITY' }]);
    const onAddTicker = jest.fn();
    const onCalculate = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { rerender } = renderWithProviders(
      <BacktestInputPanel {...defaultProps} onAddTicker={onAddTicker} onCalculate={onCalculate} />
    );

    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled();

    const input = screen.getByPlaceholderText('Add ticker…');
    await user.type(input, 'AAPL');
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await screen.findByText('Apple Inc.');
    await user.click(screen.getByRole('button', { name: /AAPL/ }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'AAPL', name: 'Apple Inc.' });

    rerender(
      <BacktestInputPanel
        {...defaultProps}
        selectedTickers={[{ ticker: 'AAPL', name: 'Apple Inc.', weightPercent: 100 }]}
        onAddTicker={onAddTicker}
        onCalculate={onCalculate}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(onCalculate).toHaveBeenCalled();
  });

  it('shows under/over allocation hints, period, amount, and watchlist add', async () => {
    const onAddTicker = jest.fn();
    const onPeriodChange = jest.fn();
    const onAmountChange = jest.fn();
    const onLoadFromPortfolio = jest.fn();
    const onRemoveTicker = jest.fn();
    const onWeightChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { rerender } = renderWithProviders(
      <BacktestInputPanel
        {...defaultProps}
        selectedTickers={[{ ticker: 'AAPL', name: 'Apple', weightPercent: 40 }]}
        onAddTicker={onAddTicker}
        onPeriodChange={onPeriodChange}
        onAmountChange={onAmountChange}
        onLoadFromPortfolio={onLoadFromPortfolio}
        onRemoveTicker={onRemoveTicker}
        onWeightChange={onWeightChange}
      />
    );

    expect(screen.getByText(/Increase allocations to reach 100%/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1Y' }));
    expect(onPeriodChange).toHaveBeenCalledWith('1y');
    await user.click(screen.getByRole('button', { name: 'Load from portfolio' }));
    expect(onLoadFromPortfolio).toHaveBeenCalled();

    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '5000');
    expect(onAmountChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /\$MSFT/ }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'MSFT', name: 'Microsoft' });

    rerender(
      <BacktestInputPanel
        {...defaultProps}
        selectedTickers={[{ ticker: 'AAPL', name: 'Apple', weightPercent: 140 }]}
        isCalculating
      />
    );
    expect(screen.getByText(/Reduce allocations to 100%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
  });

  it('handles empty/error search, the add button, invalid amount, and the max ticker cap', async () => {
    const onAddTicker = jest.fn();
    const onAmountChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const selectedTickers = Array.from({ length: BACKTEST_MAX_TICKERS }, (_, index) => ({
      ticker: `T${index}`,
      name: `Ticker ${index}`,
      weightPercent: 25,
    }));

    const { rerender } = renderWithProviders(
      <BacktestInputPanel
        {...defaultProps}
        watchlistItems={[]}
        onAddTicker={onAddTicker}
        onAmountChange={onAmountChange}
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
    await user.click(screen.getByRole('button', { name: 'Add ticker' }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'IBM', name: 'IBM' });

    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, 'abc');
    expect(onAmountChange).toHaveBeenCalledWith(BACKTEST_DEFAULT_AMOUNT);

    rerender(
      <BacktestInputPanel
        {...defaultProps}
        selectedTickers={selectedTickers}
        onAddTicker={onAddTicker}
      />
    );
    expect(screen.getByPlaceholderText('Maximum tickers reached')).toBeDisabled();
  });
});
