import { screen } from '@testing-library/react';
import type { PortfolioPosition } from '../../../../../types/portfolio.types';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { PositionsTable } from '../PositionsTable';

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

describe('PositionsTable', () => {
  it('shows the empty state without holdings', () => {
    renderWithProviders(<PositionsTable positions={[]} currency="USD" />);
    expect(screen.getByRole('heading', { name: 'No positions yet' })).toBeInTheDocument();
  });

  it('renders P&L for an open position', () => {
    renderWithProviders(<PositionsTable positions={[position]} currency="USD" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });
});
