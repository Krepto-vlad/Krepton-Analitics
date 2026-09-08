import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockQuote, fetchStockSearch } from '../../../../../api/stockApi';
import { createPortfolioPosition } from '../../../../../api/portfolioApi';
import { ERROR_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { StockQuote, StockSearchResult } from '../../../../../types/stock.types';
import { AddPositionModal } from '../AddPositionModal';

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockSearch: jest.fn(),
  fetchStockQuote: jest.fn(),
  fetchStockQuotesBatch: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn().mockResolvedValue({ USD: 1, EUR: 1 }),
}));

jest.mock('../../../../../api/portfolioApi', () => ({
  createPortfolioPosition: jest.fn().mockResolvedValue({}),
  fetchPortfolioPositions: jest.fn().mockResolvedValue([]),
  fetchPortfolioPositionsPage: jest.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
  fetchPortfolioTransactionsPage: jest
    .fn()
    .mockResolvedValue({ items: [], total: 0, hasMore: false }),
  fetchInvestmentSummary: jest.fn().mockResolvedValue({ totalInvested: 0, totalWithdrawn: 0 }),
  fetchPortfolioEquityHistory: jest.fn().mockResolvedValue([]),
  fetchPortfolioNews: jest.fn().mockResolvedValue([]),
  fetchPortfolioRebalancing: jest.fn().mockResolvedValue({
    strategyId: 'ray-dalio-all-weather',
    strategyName: 'All Weather',
    strategyDescription: '',
    strategyPhilosophy: '',
    investmentHorizon: '',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    displayCurrency: 'USD',
    totalPortfolioValue: 0,
    alignmentScore: 0,
    targetAllocations: [],
    currentAllocations: [],
    deviations: [],
    tickerMappings: [],
  }),
}));

const appleResult: StockSearchResult = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NMS',
  type: 'EQUITY',
};

const appleQuote: StockQuote = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  price: 150,
  change: 1,
  changePercent: 0.7,
  volume: 1,
  marketCap: 1,
  currency: 'USD',
  fiftyTwoWeekHigh: 200,
  fiftyTwoWeekLow: 100,
  logoUrl: null,
  marketState: 'REGULAR',
  exchange: 'NMS',
  preMarketPrice: null,
  preMarketChange: null,
  preMarketChangePercent: null,
  postMarketPrice: null,
  postMarketChange: null,
  postMarketChangePercent: null,
};

async function searchAndSelectApple() {
  jest.mocked(fetchStockSearch).mockResolvedValue([appleResult]);
  jest.mocked(fetchStockQuote).mockResolvedValue(appleQuote);

  const input = screen.getByPlaceholderText('Search ticker or company…');
  fireEvent.change(input, { target: { value: 'AAPL' } });
  await act(async () => {
    jest.advanceTimersByTime(350);
  });

  fireEvent.click(await screen.findByRole('button', { name: /AAPL/ }));
  await waitFor(() => expect(fetchStockQuote).toHaveBeenCalledWith('AAPL'));
  await waitFor(() => {
    const [, priceInput] = screen.getAllByPlaceholderText('0.00');
    expect((priceInput as HTMLInputElement).value).toBe('150.00');
  });
}

describe('AddPositionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = renderWithProviders(
      <AddPositionModal isOpen={false} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('adds a position on the happy path and closes', async () => {
    const onClose = jest.fn();
    renderWithProviders(<AddPositionModal isOpen onClose={onClose} />);

    await searchAndSelectApple();

    const [sharesInput] = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(sharesInput, { target: { value: '2' } });

    expect(screen.getByText('Total cost')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to Portfolio' }));

    await waitFor(() =>
      expect(createPortfolioPosition).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'AAPL', shares: 2, avgBuyPrice: 150 })
      )
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows validation errors and a submit failure', async () => {
    jest.mocked(createPortfolioPosition).mockRejectedValueOnce({});
    const onClose = jest.fn();
    renderWithProviders(<AddPositionModal isOpen onClose={onClose} />);

    await searchAndSelectApple();

    const [sharesInput, priceInput] = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(sharesInput, { target: { value: '-1' } });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(await screen.findByText('Shares must be a positive number')).toBeInTheDocument();

    fireEvent.change(sharesInput, { target: { value: '1' } });
    fireEvent.change(priceInput, { target: { value: '0' } });
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(
      await screen.findByText('Price per share must be a positive number')
    ).toBeInTheDocument();

    fireEvent.change(priceInput, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Portfolio' }));
    expect(
      await screen.findByText(ERROR_MESSAGES.PORTFOLIO_POSITION_ADD_FAILED)
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles empty search, search errors, quote errors, and closing', async () => {
    const onClose = jest.fn();
    renderWithProviders(<AddPositionModal isOpen onClose={onClose} />);

    const input = screen.getByPlaceholderText('Search ticker or company…');
    fireEvent.change(input, { target: { value: '   ' } });
    jest.mocked(fetchStockSearch).mockRejectedValueOnce(new Error('search down'));
    fireEvent.change(input, { target: { value: 'ZZZ' } });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    jest.mocked(fetchStockSearch).mockResolvedValueOnce([appleResult]);
    jest.mocked(fetchStockQuote).mockRejectedValueOnce(new Error('quote down'));
    fireEvent.change(input, { target: { value: 'AAPL' } });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    fireEvent.click(await screen.findByRole('button', { name: /AAPL/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the header close button', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<AddPositionModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
