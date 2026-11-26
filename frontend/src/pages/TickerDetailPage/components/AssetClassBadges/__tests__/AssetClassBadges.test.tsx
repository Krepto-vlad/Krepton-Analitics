import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchStockAssetClass } from '../../../../../api/stockApi';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { AssetClassBadges } from '../AssetClassBadges';

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockAssetClass: jest.fn(),
}));

const mockedFetch = fetchStockAssetClass as jest.MockedFunction<typeof fetchStockAssetClass>;

describe('AssetClassBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeletons while loading, then the badges', async () => {
    let resolveRequest:
      ((value: Awaited<ReturnType<typeof fetchStockAssetClass>>) => void) | undefined;
    mockedFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    renderWithProviders(<AssetClassBadges ticker="VOO" />);

    expect(screen.getByLabelText('Loading asset class')).toBeInTheDocument();

    resolveRequest?.({
      ticker: 'VOO',
      badges: [
        { assetClass: 'equities', label: 'Equities' },
        { assetClass: 'sp500', label: 'S&P 500' },
      ],
      basis: {
        evidence: 'explicit',
        quoteType: 'ETF',
        categoryName: 'Large Blend',
        nameSignal: 'S&P 500 / 500 Index in fund name',
        classifiedAt: '2026-11-26T12:00:00.000Z',
      },
    });

    expect(await screen.findByRole('button', { name: 'Equities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'S&P 500' })).toBeInTheDocument();
  });

  it('renders nothing when classification has no badges', async () => {
    mockedFetch.mockResolvedValue({
      ticker: 'UPRO',
      badges: [],
      basis: null,
    });

    const { container } = renderWithProviders(<AssetClassBadges ticker="UPRO" />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith('UPRO'));
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the basis dialog from a badge', async () => {
    const user = userEvent.setup();
    mockedFetch.mockResolvedValue({
      ticker: 'V',
      badges: [{ assetClass: 'equities', label: 'Equities' }],
      basis: {
        evidence: 'explicit',
        quoteType: 'EQUITY',
        categoryName: null,
        nameSignal: null,
        classifiedAt: '2026-11-26T12:00:00.000Z',
      },
    });

    renderWithProviders(<AssetClassBadges ticker="V" />);

    await user.click(await screen.findByRole('button', { name: 'Equities' }));

    expect(screen.getByRole('dialog', { name: 'Classification basis' })).toBeInTheDocument();
    expect(screen.getByText('EQUITY')).toBeInTheDocument();
    expect(screen.getByText(/Classified by our rebalancing rules/)).toBeInTheDocument();
  });

  it('hides badges when the request fails', async () => {
    mockedFetch.mockRejectedValue(new Error('network'));
    const { container } = renderWithProviders(<AssetClassBadges ticker="AAPL" />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
