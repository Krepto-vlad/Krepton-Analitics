import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createTestStore } from '../../__tests__/renderWithProviders';
import { useTickerPriceChart } from '../useTickerPriceChart';
import type { OhlcvCandle } from '../../types/stock.types';
import type { PortfolioTransaction } from '../../api/portfolioApi';

const subscribeCrosshairMove = jest.fn();

jest.mock(
  'lightweight-charts',
  () => ({
    ColorType: { Solid: 'solid' },
    AreaSeries: 'AreaSeries',
    createChart: () => ({
      addSeries: () => ({
        applyOptions: jest.fn(),
        setData: jest.fn(),
      }),
      applyOptions: jest.fn(),
      timeScale: () => ({ fitContent: jest.fn() }),
      remove: jest.fn(),
      subscribeCrosshairMove,
      unsubscribeCrosshairMove: jest.fn(),
    }),
    createSeriesMarkers: () => ({ setMarkers: jest.fn(), detach: jest.fn() }),
  }),
  { virtual: true }
);

const candles: OhlcvCandle[] = [
  { time: 1725148800, open: 1, high: 2, low: 1, close: 1.5, volume: 10 },
];

const trade: PortfolioTransaction = {
  id: 't1',
  ticker: 'AAPL',
  companyName: 'Apple',
  shares: 1,
  pricePerShare: 10,
  currency: 'USD',
  transactionDate: '2026-09-01',
  transactionType: 'BUY',
  createdAt: '2026-09-01T00:00:00.000Z',
};

function ChartHarness() {
  const { containerRef, hoveredTrade } = useTickerPriceChart(
    candles,
    'USD',
    [
      {
        time: '2026-09-01' as never,
        position: 'aboveBar',
        color: '#fff',
        shape: 'arrowUp',
        id: 't1',
      },
    ],
    [trade]
  );

  return (
    <div>
      <div ref={containerRef} data-testid="chart" />
      {hoveredTrade ? <p>Hovered {hoveredTrade.trade.ticker}</p> : null}
    </div>
  );
}

describe('useTickerPriceChart', () => {
  it('creates a chart and reports hovered markers', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <ChartHarness />
      </Provider>
    );

    expect(screen.getByTestId('chart')).toBeInTheDocument();

    const handler = subscribeCrosshairMove.mock.calls[0]?.[0] as (param: {
      point?: { x: number; y: number };
      hoveredInfo?: { objectKind: string; objectId: string };
    }) => void;

    act(() => {
      handler?.({
        point: { x: 10, y: 20 },
        hoveredInfo: { objectKind: 'series-marker', objectId: 't1' },
      });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
      window.dispatchEvent(new Event('blur'));
    });
  });
});
