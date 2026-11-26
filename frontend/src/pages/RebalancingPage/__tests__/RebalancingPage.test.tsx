import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fetchPortfolioRebalancing,
  fetchRebalancingStrategies,
  updatePortfolioRebalancingStrategy,
} from '../../../api/portfolioApi';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import type {
  RebalancingAnalysisResponse,
  RebalancingStrategyOption,
} from '../../../types/rebalancing.types';
import { RebalancingPage } from '../RebalancingPage';

jest.mock('../../../api/portfolioApi', () => ({
  fetchRebalancingStrategies: jest.fn(),
  fetchPortfolioRebalancing: jest.fn(),
  updatePortfolioRebalancingStrategy: jest.fn(),
}));

jest.mock('../components/StrategyPanel/StrategyPanel', () => ({
  StrategyPanel: (props: {
    selectedStrategyId: string;
    allocations: Array<{ bucketId: string }>;
    onStrategyChange: (strategyId: string) => void;
    onAllocationChange: (bucketId: string, weightPercent: number) => void;
    onStepAllocation: (bucketId: string, delta: number) => void;
    onSaveAsCustom: () => void;
  }) => (
    <div>
      <p>Selected strategy: {props.selectedStrategyId}</p>
      <button type="button" onClick={() => props.onStrategyChange('warren-buffett-9010')}>
        Select Buffett
      </button>
      <button
        type="button"
        onClick={() => props.onAllocationChange(props.allocations[0]?.bucketId ?? 'stocks', 40)}
      >
        Change weight
      </button>
      <button
        type="button"
        onClick={() => props.onStepAllocation(props.allocations[0]?.bucketId ?? 'stocks', 1)}
      >
        Step weight
      </button>
      <button type="button" onClick={() => props.onSaveAsCustom()}>
        Save as custom
      </button>
    </div>
  ),
}));

jest.mock('../components/AllocationComparisonChart/AllocationComparisonChart', () => ({
  AllocationComparisonChart: () => <div>Allocation chart</div>,
}));

jest.mock('../../../components/PortfolioHealthCard/PortfolioHealthCard', () => ({
  PortfolioHealthCard: (props: {
    alignmentScore: number | null;
    strategyName: string | null;
    showDriftAlert?: boolean;
    showAssetClassHint?: boolean;
    navigation?: unknown;
  }) => (
    <div>
      Health card {props.strategyName}: {props.alignmentScore ?? 'no score'}
      {props.showDriftAlert === false ? ' without drift banner' : ''}
      {props.navigation ? ' with link' : ' without link'}
      {props.showAssetClassHint ? ' with badge hint' : ''}
    </div>
  ),
}));

jest.mock('../components/TickerMappingPanel/TickerMappingPanel', () => ({
  TickerMappingPanel: () => <div>Ticker mappings</div>,
}));

jest.mock('../components/AlignmentExplainPanel/AlignmentExplainPanel', () => ({
  AlignmentExplainPanel: (props: { strategyName: string; hasHoldings: boolean }) => (
    <div>
      AI panel for {props.strategyName}
      {props.hasHoldings ? ' with holdings' : ' without holdings'}
    </div>
  ),
}));

const allWeather: RebalancingStrategyOption = {
  id: 'ray-dalio-all-weather',
  name: 'All Weather',
  description: 'Balanced risk',
  philosophy: 'Risk parity',
  investmentHorizon: 'Long-term',
  buckets: [
    { id: 'stocks', label: 'Stocks', color: '#111111', targetPercent: 30 },
    { id: 'bonds', label: 'Bonds', color: '#222222', targetPercent: 70 },
  ],
};

const buffett: RebalancingStrategyOption = {
  id: 'warren-buffett-9010',
  name: 'Buffett 90/10',
  description: 'Equity heavy',
  philosophy: 'Stocks plus cash',
  investmentHorizon: 'Long-term',
  buckets: [
    { id: 'stocks', label: 'Stocks', color: '#111111', targetPercent: 90 },
    { id: 'bonds', label: 'Bonds', color: '#222222', targetPercent: 10 },
  ],
};

function analysis(
  overrides: Partial<RebalancingAnalysisResponse> = {}
): RebalancingAnalysisResponse {
  return {
    strategyId: 'ray-dalio-all-weather',
    strategyName: 'All Weather',
    strategyDescription: 'Balanced risk',
    strategyPhilosophy: 'Risk parity',
    investmentHorizon: 'Long-term',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    includePermanentCash: true,
    displayCurrency: 'USD',
    totalPortfolioValue: 25000,
    alignmentScore: 72.4,
    targetAllocations: [
      { bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 30 },
      { bucketId: 'bonds', label: 'Bonds', color: '#222222', weightPercent: 70 },
    ],
    currentAllocations: [
      { bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 80 },
      { bucketId: 'bonds', label: 'Bonds', color: '#222222', weightPercent: 20 },
    ],
    deviations: [],
    tickerMappings: [
      {
        ticker: 'AAPL',
        sector: 'Technology',
        marketValue: 25000,
        bucketId: 'stocks',
        bucketLabel: 'Stocks',
        inferredAssetClass: 'equity',
        mappingSource: 'ticker',
      },
    ],
    ...overrides,
  };
}

function mockSuccessfulLoad(rebalancing = analysis()) {
  jest.mocked(fetchRebalancingStrategies).mockResolvedValue([allWeather, buffett]);
  jest.mocked(fetchPortfolioRebalancing).mockResolvedValue(rebalancing);
}

describe('RebalancingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading skeleton while analysis is fetched', () => {
    jest.mocked(fetchRebalancingStrategies).mockReturnValue(new Promise(() => undefined));
    jest.mocked(fetchPortfolioRebalancing).mockReturnValue(new Promise(() => undefined));

    renderWithProviders(<RebalancingPage />);

    expect(
      screen.getByRole('status', { name: LOADING_MESSAGES.REBALANCING_ANALYSIS })
    ).toBeInTheDocument();
  });

  it('renders the technical analysis after a successful load', async () => {
    mockSuccessfulLoad();

    renderWithProviders(<RebalancingPage />);

    expect(await screen.findByText('Selected strategy: ray-dalio-all-weather')).toBeInTheDocument();
    expect(screen.getByText('Allocation chart')).toBeInTheDocument();
    expect(screen.getByText('Ticker mappings')).toBeInTheDocument();
  });

  it('shows the portfolio health card from the same analysis, without link or drift banner', async () => {
    mockSuccessfulLoad();

    renderWithProviders(<RebalancingPage />);

    expect(
      await screen.findByText(
        'Health card All Weather: 72.4 without drift banner without link with badge hint'
      )
    ).toBeInTheDocument();
  });

  it('keeps the health card empty until the portfolio has holdings', async () => {
    mockSuccessfulLoad(analysis({ totalPortfolioValue: 0, tickerMappings: [] }));

    renderWithProviders(<RebalancingPage />);

    expect(await screen.findByText(/Health card All Weather: no score/)).toBeInTheDocument();
  });

  it('shows an error banner when loading fails', async () => {
    jest.mocked(fetchRebalancingStrategies).mockRejectedValue({});
    jest.mocked(fetchPortfolioRebalancing).mockRejectedValue({});

    renderWithProviders(<RebalancingPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ERROR_MESSAGES.PORTFOLIO_REBALANCING_FAILED
    );
  });

  it('switches to the AI insights tab', async () => {
    mockSuccessfulLoad();
    const user = userEvent.setup();

    renderWithProviders(<RebalancingPage />);
    await screen.findByText('Selected strategy: ray-dalio-all-weather');

    await user.click(screen.getByRole('button', { name: /AI Insights/i }));

    expect(screen.getByText(/AI panel for All Weather/)).toBeInTheDocument();
    expect(screen.getByText(/with holdings/)).toBeInTheDocument();
  });

  it('persists a strategy change and can save a custom allocation', async () => {
    mockSuccessfulLoad();
    jest.mocked(updatePortfolioRebalancingStrategy).mockResolvedValue(
      analysis({
        strategyId: 'custom',
        strategyName: 'My Custom Strategy',
        savedCustomStrategy: {
          baseStrategyId: 'warren-buffett-9010',
          baseStrategyName: 'Buffett 90/10',
          targetAllocations: [
            { bucketId: 'stocks', label: 'Stocks', color: '#111111', weightPercent: 40 },
            { bucketId: 'bonds', label: 'Bonds', color: '#222222', weightPercent: 60 },
          ],
        },
      })
    );
    const user = userEvent.setup();

    renderWithProviders(<RebalancingPage />);
    await screen.findByText('Selected strategy: ray-dalio-all-weather');

    await user.click(screen.getByRole('button', { name: 'Select Buffett' }));
    await waitFor(() =>
      expect(updatePortfolioRebalancingStrategy).toHaveBeenCalledWith(
        { strategyId: 'warren-buffett-9010' },
        'USD'
      )
    );

    await user.click(screen.getByRole('button', { name: 'Change weight' }));
    await user.click(screen.getByRole('button', { name: 'Step weight' }));
    await user.click(screen.getByRole('button', { name: 'Save as custom' }));

    await waitFor(() =>
      expect(updatePortfolioRebalancingStrategy).toHaveBeenCalledWith(
        expect.objectContaining({ strategyId: 'custom' }),
        'USD'
      )
    );
  });

  it('shows a save error when persisting the strategy fails', async () => {
    mockSuccessfulLoad();
    jest.mocked(updatePortfolioRebalancingStrategy).mockRejectedValue({});
    const user = userEvent.setup();

    renderWithProviders(<RebalancingPage />);
    await screen.findByText('Selected strategy: ray-dalio-all-weather');

    await user.click(screen.getByRole('button', { name: 'Select Buffett' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ERROR_MESSAGES.PORTFOLIO_REBALANCING_SAVE_FAILED
    );
  });

  it('includes a saved custom strategy and ignores a cancelled load', async () => {
    mockSuccessfulLoad(
      analysis({
        savedCustomStrategy: {
          baseStrategyId: 'ray-dalio-all-weather',
          baseStrategyName: 'All Weather',
          targetAllocations: allWeather.buckets.map((bucket) => ({
            bucketId: bucket.id,
            label: bucket.label,
            color: bucket.color,
            weightPercent: bucket.targetPercent,
          })),
        },
      })
    );

    const { unmount } = renderWithProviders(<RebalancingPage />);
    await screen.findByText('Selected strategy: ray-dalio-all-weather');
    unmount();

    let resolveStrategies: (value: RebalancingStrategyOption[]) => void = () => undefined;
    jest.mocked(fetchRebalancingStrategies).mockReturnValue(
      new Promise((resolve) => {
        resolveStrategies = resolve;
      })
    );
    jest.mocked(fetchPortfolioRebalancing).mockReturnValue(new Promise(() => undefined));

    const second = renderWithProviders(<RebalancingPage />);
    second.unmount();

    await act(async () => {
      resolveStrategies([allWeather, buffett]);
    });
  });
});
