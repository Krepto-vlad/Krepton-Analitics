import { screen } from '@testing-library/react';
import { PORTFOLIO_POSITIONS_PATH } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { PortfolioStats } from '../../../../../types/portfolio.types';
import { PortfolioEquityCard } from '../PortfolioEquityCard';

jest.mock('../../../../../hooks/useEquityChart', () => ({
  useEquityChart: () => ({
    containerRef: { current: null },
    selectedPeriod: '1Y',
    setSelectedPeriod: jest.fn(),
  }),
}));

const stats: PortfolioStats = {
  totalValue: 1500,
  totalPnl: 500,
  unrealizedPnl: 500,
  realizedPnl: 0,
  dayPnl: 10,
  totalPnlPercent: 50,
  dayPnlPercent: 0.7,
};

const emptyStats: PortfolioStats = {
  totalValue: 0,
  totalPnl: 0,
  unrealizedPnl: 0,
  realizedPnl: 0,
  dayPnl: 0,
  totalPnlPercent: 0,
  dayPnlPercent: 0,
};

describe('PortfolioEquityCard', () => {
  it('opens the portfolio only from the corner link, so the chart stays free', () => {
    renderWithProviders(
      <PortfolioEquityCard stats={stats} equityHistory={[]} currency="USD" isLoading={false} />
    );

    expect(screen.getByRole('link', { name: 'Open portfolio' })).toHaveAttribute(
      'href',
      PORTFOLIO_POSITIONS_PATH
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('has no corner link while loading', () => {
    renderWithProviders(
      <PortfolioEquityCard stats={stats} equityHistory={[]} currency="USD" isLoading />
    );

    expect(screen.queryByRole('link', { name: 'Open portfolio' })).not.toBeInTheDocument();
  });

  it('shows only the empty state action when there is no equity data', () => {
    renderWithProviders(
      <PortfolioEquityCard stats={emptyStats} equityHistory={[]} currency="USD" isLoading={false} />
    );

    expect(screen.queryByRole('link', { name: 'Open portfolio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Position' })).toBeInTheDocument();
  });
});
