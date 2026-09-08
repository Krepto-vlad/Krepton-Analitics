import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockCompare } from '../../../api/stockApi';
import { ERROR_MESSAGES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import type { StockCompareItem } from '../../../types/stock.types';
import { ScreenerPage } from '../ScreenerPage';

jest.mock('../../../api/stockApi', () => ({
  fetchStockCompare: jest.fn(),
  fetchMarketMovers: jest
    .fn()
    .mockResolvedValue({ gainers: [], losers: [], fetchedAt: '2026-01-02T00:00:00.000Z' }),
  fetchStockSearch: jest.fn(),
}));

jest.mock('../components/MarketMoversPanel/MarketMoversPanel', () => ({
  MarketMoversPanel: (props: {
    onAddTicker: (ticker: { ticker: string; name: string }) => void;
    canAddTickers: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => props.onAddTicker({ ticker: 'AAPL', name: 'Apple' })}>
        Add AAPL from movers
      </button>
      <button type="button" onClick={() => props.onAddTicker({ ticker: 'AAPL', name: 'Apple' })}>
        Add AAPL duplicate
      </button>
      <span>{props.canAddTickers ? 'can add' : 'maxed'}</span>
    </div>
  ),
}));

jest.mock('../components/TickerPickerBar/TickerPickerBar', () => ({
  TickerPickerBar: (props: {
    selectedTickers: Array<{ ticker: string }>;
    onAddTicker: (ticker: { ticker: string; name: string }) => void;
    onRemoveTicker: (ticker: string) => void;
  }) => (
    <div>
      <p>Picked: {props.selectedTickers.map((item) => item.ticker).join(',') || 'none'}</p>
      <button
        type="button"
        onClick={() => props.onAddTicker({ ticker: 'MSFT', name: 'Microsoft' })}
      >
        Add MSFT
      </button>
      <button type="button" onClick={() => props.onRemoveTicker('AAPL')}>
        Remove AAPL
      </button>
    </div>
  ),
}));

jest.mock('../components/ComparisonMatrix/ComparisonMatrix', () => ({
  ComparisonMatrix: (props: {
    items: StockCompareItem[];
    isLoading: boolean;
    selectedCount: number;
  }) => (
    <div>
      {props.isLoading
        ? 'Comparing…'
        : `Compared ${props.items.map((item) => item.ticker).join(',') || 'none'}`}
      <span>selected {props.selectedCount}</span>
    </div>
  ),
}));

function compareItem(ticker: string): StockCompareItem {
  return {
    ticker,
    name: ticker,
    currency: 'USD',
    price: 100,
    sector: 'Technology',
    industry: 'Software',
    marketCap: 1,
    enterpriseValue: 1,
    trailingEps: 1,
    peRatio: 20,
    forwardPeRatio: 18,
    pegRatio: 1,
    psRatio: 5,
    priceToBook: 4,
    evToEbitda: 12,
    roe: 0.2,
    roa: 0.1,
    profitMargin: 0.2,
    operatingMargin: 0.2,
    revenueGrowth: 0.1,
    earningsGrowth: 0.1,
    debtToEquity: 0.3,
    currentRatio: 1.5,
    dividendYield: 0.01,
    payoutRatio: 0.2,
    beta: 1,
  };
}

describe('ScreenerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not compare until two tickers are selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScreenerPage />, {
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

    await user.click(screen.getByRole('button', { name: 'Add AAPL from movers' }));
    expect(screen.getByText('Picked: AAPL')).toBeInTheDocument();
    expect(fetchStockCompare).not.toHaveBeenCalled();
  });

  it('compares tickers in selection order and can remove one', async () => {
    jest.mocked(fetchStockCompare).mockResolvedValue({
      tickers: ['MSFT', 'AAPL'],
      items: [compareItem('AAPL'), compareItem('MSFT')],
    });
    const user = userEvent.setup();
    renderWithProviders(<ScreenerPage />, {
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

    await user.click(screen.getByRole('button', { name: 'Add AAPL from movers' }));
    await user.click(screen.getByRole('button', { name: 'Add AAPL duplicate' }));
    await user.click(screen.getByRole('button', { name: 'Add MSFT' }));

    expect(await screen.findByText('Compared AAPL,MSFT')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove AAPL' }));
    await waitFor(() => expect(screen.getByText('Picked: MSFT')).toBeInTheDocument());
  });

  it('shows a compare error', async () => {
    jest.mocked(fetchStockCompare).mockRejectedValue({});
    const user = userEvent.setup();
    renderWithProviders(<ScreenerPage />, {
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

    await user.click(screen.getByRole('button', { name: 'Add AAPL from movers' }));
    await user.click(screen.getByRole('button', { name: 'Add MSFT' }));
    expect(await screen.findByText(ERROR_MESSAGES.STOCK_COMPARE_FAILED)).toBeInTheDocument();
  });
});
