import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { MarketIndexData } from '../../../../../hooks/useMarketIndexData';
import type { StockQuote } from '../../../../../types/stock.types';
import { MarketIndexCard } from '../MarketIndexCard';

jest.mock('../../../../../hooks/useIndexSparkline', () => ({
  useIndexSparkline: () => ({ containerRef: { current: null } }),
}));

function readyData(changePercent: number): MarketIndexData {
  return {
    status: 'ready',
    quote: { ticker: '^GSPC', price: 7182.78, changePercent } as StockQuote,
    candles: [{ time: 1, open: 1, high: 2, low: 1, close: 2, volume: 1 }],
  };
}

describe('MarketIndexCard', () => {
  it('shows the level and the daily move with a link to the index page', () => {
    renderWithProviders(<MarketIndexCard ticker="^GSPC" label="S&P 500" data={readyData(-0.25)} />);

    expect(screen.getByText('7,182.78')).toBeInTheDocument();
    expect(screen.getByText('-0.25%')).toBeInTheDocument();
    expect(screen.getByText('today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open S&P 500' })).toHaveAttribute(
      'href',
      '/ticker/%5EGSPC'
    );
  });

  it('prefixes gains with a plus sign', () => {
    renderWithProviders(<MarketIndexCard ticker="^DJI" label="Dow Jones" data={readyData(0.33)} />);

    expect(screen.getByText('+0.33%')).toBeInTheDocument();
  });

  it('shows a busy placeholder and no link while loading', () => {
    renderWithProviders(
      <MarketIndexCard
        ticker="^GSPC"
        label="S&P 500"
        data={{ status: 'loading', quote: null, candles: [] }}
      />
    );

    expect(screen.getByRole('article', { name: 'S&P 500', busy: true })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('explains when the data is unavailable', () => {
    renderWithProviders(
      <MarketIndexCard
        ticker="^GSPC"
        label="S&P 500"
        data={{ status: 'error', quote: null, candles: [] }}
      />
    );

    expect(screen.getByText('Index data is unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a hide control and drops the corner link while editing', async () => {
    const user = userEvent.setup();
    const onHide = jest.fn();
    renderWithProviders(
      <MarketIndexCard
        ticker="^GSPC"
        label="S&P 500"
        data={readyData(-0.25)}
        isEditing
        onHide={onHide}
      />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide S&P 500' }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
