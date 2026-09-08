import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { PortfolioHealthDeviation } from '../../../../../types/portfolio.types';
import { PortfolioHealthCard } from '../PortfolioHealthCard';

const overweight: PortfolioHealthDeviation = {
  bucketId: 'stocks',
  label: 'Stocks',
  color: '#ef4444',
  currentPercent: 80,
  targetPercent: 30,
  deviationPercent: 50,
  status: 'overweight',
};

const underweight: PortfolioHealthDeviation = {
  bucketId: 'bonds',
  label: 'Bonds',
  color: '#3b82f6',
  currentPercent: 10,
  targetPercent: 40,
  deviationPercent: -30,
  status: 'underweight',
};

const optimal: PortfolioHealthDeviation = {
  bucketId: 'gold',
  label: 'Gold',
  color: '#f59e0b',
  currentPercent: 15,
  targetPercent: 15,
  deviationPercent: 0,
  status: 'optimal',
};

describe('PortfolioHealthCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows the empty state when there is no score', () => {
    renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={null}
        strategyId={null}
        strategyName={null}
        deviations={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('No alignment data yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Position' })).toHaveAttribute(
      'href',
      `${ROUTES.PORTFOLIO}?section=positions`
    );
  });

  it('shows loading placeholders without a score', () => {
    renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={null}
        strategyId={null}
        strategyName={null}
        deviations={[]}
        isLoading
      />
    );

    expect(screen.getByLabelText('Loading strategy alignment score')).toBeInTheDocument();
    expect(screen.queryByText('No alignment data yet')).not.toBeInTheDocument();
  });

  it('renders a well aligned score, deviations, and the rebalancing link', () => {
    renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={90}
        strategyId="ray-dalio-all-weather"
        strategyName="All Weather"
        deviations={[optimal, overweight]}
        isLoading={false}
      />
    );

    expect(screen.getByText('Well Aligned')).toBeInTheDocument();
    expect(screen.getByText('All Weather')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open rebalancing engine' })).toHaveAttribute(
      'href',
      ROUTES.REBALANCING
    );
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Strategy drift detected')).toBeInTheDocument();
    expect(screen.getByText(/over-weight/)).toBeInTheDocument();
  });

  it('renders moderate and high drift labels and a full gauge', () => {
    const { rerender } = renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={70}
        strategyId="buffett"
        strategyName="Buffett 90/10"
        deviations={[underweight]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Moderate Drift')).toBeInTheDocument();
    expect(screen.getByText(/under-weight/)).toBeInTheDocument();

    rerender(
      <PortfolioHealthCard
        alignmentScore={100}
        strategyId="buffett"
        strategyName="Buffett 90/10"
        deviations={[]}
        isLoading={false}
      />
    );
    expect(screen.getByText('Well Aligned')).toBeInTheDocument();

    rerender(
      <PortfolioHealthCard
        alignmentScore={0}
        strategyId="buffett"
        strategyName="Buffett 90/10"
        deviations={[]}
        isLoading={false}
      />
    );
    expect(screen.getByText('High Drift')).toBeInTheDocument();
  });

  it('dismisses the drift alert and ignores dismiss without a strategy id', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={50}
        strategyId="ray-dalio-all-weather"
        strategyName="All Weather"
        deviations={[overweight]}
        isLoading={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss strategy drift alert' }));
    expect(screen.queryByText('Strategy drift detected')).not.toBeInTheDocument();

    const { rerender } = renderWithProviders(
      <PortfolioHealthCard
        alignmentScore={40}
        strategyId={null}
        strategyName="All Weather"
        deviations={[overweight]}
        isLoading={false}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss strategy drift alert' }));
    expect(screen.getByText('Strategy drift detected')).toBeInTheDocument();
    rerender(
      <PortfolioHealthCard
        alignmentScore={40}
        strategyId={null}
        strategyName="All Weather"
        deviations={[overweight]}
        isLoading={false}
      />
    );
  });
});
