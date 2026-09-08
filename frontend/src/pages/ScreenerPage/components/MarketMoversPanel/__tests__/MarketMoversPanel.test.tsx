import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchLiveFxRates } from '../../../../../api/fxApi';
import { fetchMarketMovers } from '../../../../../api/stockApi';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { MarketMoversResponse } from '../../../../../types/stock.types';
import { MarketMoversPanel } from '../MarketMoversPanel';

jest.mock('../../../../../api/stockApi', () => ({
  fetchMarketMovers: jest.fn(),
}));

jest.mock('../../../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn().mockResolvedValue({ USD: 1, EUR: 0.9 }),
}));

function movers(overrides: Partial<MarketMoversResponse> = {}): MarketMoversResponse {
  return {
    fetchedAt: '2026-01-02T15:30:00.000Z',
    gainers: [
      {
        ticker: 'NVDA',
        name: 'NVIDIA',
        price: 875,
        change: 12,
        changePercent: 1.4,
        volume: 1,
        marketCap: 1,
        currency: 'USD',
      },
    ],
    losers: [
      {
        ticker: 'TLT',
        name: 'iShares 20+ Year Treasury',
        price: 94,
        change: -1,
        changePercent: -0.8,
        volume: 1,
        marketCap: 1,
        currency: 'USD',
      },
    ],
    ...overrides,
  };
}

describe('MarketMoversPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading skeleton then gainers and losers', async () => {
    jest.mocked(fetchMarketMovers).mockReturnValue(new Promise(() => undefined));
    renderWithProviders(
      <MarketMoversPanel selectedTickers={[]} canAddTickers onAddTicker={jest.fn()} />
    );
    expect(
      screen.getByRole('status', { name: LOADING_MESSAGES.MARKET_MOVERS })
    ).toBeInTheDocument();
  });

  it('renders movers, converts FX, and adds a ticker', async () => {
    jest.mocked(fetchMarketMovers).mockResolvedValue(
      movers({
        losers: [
          {
            ticker: 'SAP',
            name: 'SAP',
            price: 100,
            change: -2,
            changePercent: -1.2,
            volume: 1,
            marketCap: 1,
            currency: 'EUR',
          },
        ],
      })
    );
    const onAddTicker = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <MarketMoversPanel
        selectedTickers={[{ ticker: 'NVDA', name: 'NVIDIA' }]}
        canAddTickers
        onAddTicker={onAddTicker}
      />
    );

    expect(await screen.findByText('$NVDA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NVDA already in comparison' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add SAP to comparison' }));
    expect(onAddTicker).toHaveBeenCalledWith({ ticker: 'SAP', name: 'SAP' });
    await waitFor(() => expect(fetchLiveFxRates).toHaveBeenCalled());
  });

  it('shows empty columns, an invalid fetched-at stamp, and refresh errors', async () => {
    jest
      .mocked(fetchMarketMovers)
      .mockResolvedValue(movers({ gainers: [], losers: [], fetchedAt: 'not-a-date' }));
    const user = userEvent.setup();
    renderWithProviders(
      <MarketMoversPanel selectedTickers={[]} canAddTickers={false} onAddTicker={jest.fn()} />
    );

    expect(await screen.findByText('No gainers available right now.')).toBeInTheDocument();
    expect(screen.getByText('No losers available right now.')).toBeInTheDocument();
    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();

    jest.mocked(fetchMarketMovers).mockRejectedValueOnce({});
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText(ERROR_MESSAGES.STOCK_MOVERS_FAILED)).toBeInTheDocument();
  });

  it('shows an error when the initial load fails and can recover on refresh', async () => {
    jest.mocked(fetchMarketMovers).mockRejectedValueOnce({});
    const user = userEvent.setup();
    renderWithProviders(
      <MarketMoversPanel selectedTickers={[]} canAddTickers onAddTicker={jest.fn()} />
    );

    expect(await screen.findByText(ERROR_MESSAGES.STOCK_MOVERS_FAILED)).toBeInTheDocument();
    jest.mocked(fetchMarketMovers).mockResolvedValueOnce(movers());
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(await screen.findByText('$NVDA')).toBeInTheDocument();
  });
});
