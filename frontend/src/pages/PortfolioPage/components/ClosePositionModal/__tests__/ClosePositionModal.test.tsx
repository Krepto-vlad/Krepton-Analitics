import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { closePortfolioPosition } from '../../../../../api/portfolioApi';
import { fetchStockQuote } from '../../../../../api/stockApi';
import type { PortfolioPosition } from '../../../../../types/portfolio.types';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { ClosePositionModal } from '../ClosePositionModal';

jest.mock('../../../../../api/stockApi', () => ({
  fetchStockQuote: jest.fn(),
}));

jest.mock('../../../../../api/portfolioApi', () => ({
  ...jest.requireActual('../../../../../api/portfolioApi'),
  closePortfolioPosition: jest.fn(),
}));

const position: PortfolioPosition = {
  id: 'p1',
  ticker: 'AAPL',
  companyName: 'Apple',
  shares: 2,
  avgBuyPrice: 100,
  entryDate: '2026-01-01',
  currentPrice: 150,
  currency: 'USD',
  sector: 'Technology',
  logoUrl: null,
};

describe('ClosePositionModal', () => {
  it('returns null when closed', () => {
    const { container } = renderWithProviders(
      <ClosePositionModal isOpen={false} position={position} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('records a full close using the live quote', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchStockQuote).mockResolvedValue({
      ticker: 'AAPL',
      name: 'Apple',
      price: 150,
      change: 1,
      changePercent: 1,
      volume: 1,
      marketCap: 1,
      currency: 'USD',
      fiftyTwoWeekHigh: 1,
      fiftyTwoWeekLow: 1,
      logoUrl: null,
      marketState: 'REGULAR',
      exchange: 'NMS',
      preMarketPrice: null,
      preMarketChange: null,
      preMarketChangePercent: null,
      postMarketPrice: null,
      postMarketChange: null,
      postMarketChangePercent: null,
    });
    jest.mocked(closePortfolioPosition).mockResolvedValue({
      success: true,
      data: null,
      closed: true,
    });
    const onClose = jest.fn();

    renderWithProviders(<ClosePositionModal isOpen position={position} onClose={onClose} />);

    expect(await screen.findByDisplayValue('150.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record Sale' }));
    expect(closePortfolioPosition).toHaveBeenCalled();
  });
});
