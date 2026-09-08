import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fetchAlignmentExplanationQuota,
  generateAlignmentExplanation,
} from '../../../../../api/portfolioApi';
import { ERROR_MESSAGES, LOADING_MESSAGES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import type { AlignmentExplanationResponse } from '../../../../../types/ai.types';
import { AlignmentExplainPanel } from '../AlignmentExplainPanel';

jest.mock('../../../../../api/portfolioApi', () => ({
  fetchAlignmentExplanationQuota: jest.fn(),
  generateAlignmentExplanation: jest.fn(),
}));

jest.mock('../../../../../utils/alignmentExplainStorage', () => ({
  loadPersistedAlignmentExplanation: jest.fn().mockReturnValue(null),
  savePersistedAlignmentExplanation: jest.fn(),
  clearPersistedAlignmentExplanation: jest.fn(),
}));

const explanation: AlignmentExplanationResponse = {
  explanationDate: '2026-01-02',
  strategyId: 'ray-dalio-all-weather',
  strategyName: 'All Weather',
  alignmentScore: 72,
  overview: 'Your portfolio is equity-heavy versus the target.',
  keyDrifts: [{ title: 'Stocks overweight', explanation: 'Reduce equity concentration.' }],
  falseDiversification: {
    riskLevel: 'high',
    title: 'Tech cluster',
    explanation: 'Several holdings share the same factor.',
  },
  whatItMeans: 'Consider adding ballast assets.',
  disclaimer: 'Not financial advice.',
  fromCache: true,
  quota: { used: 1, limit: 3, remaining: 2, resetsAt: '2026-01-03T00:00:00.000Z' },
};

const defaultProps = {
  strategyId: 'ray-dalio-all-weather',
  strategyName: 'All Weather',
  alignmentScore: 72.4,
  displayCurrency: 'USD' as const,
  hasHoldings: true,
};

describe('AlignmentExplainPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchAlignmentExplanationQuota).mockResolvedValue({
      used: 0,
      limit: 3,
      remaining: 3,
      resetsAt: '2026-01-03T00:00:00.000Z',
    });
  });

  it('asks for holdings when the portfolio is empty', () => {
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} hasHoldings={false} />);
    expect(
      screen.getByText(/Add portfolio holdings to get a plain-English explanation/)
    ).toBeInTheDocument();
  });

  it('loads quota and generates an explanation', async () => {
    jest.mocked(generateAlignmentExplanation).mockResolvedValue(explanation);
    const user = userEvent.setup();
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} />);

    expect(await screen.findByText('3 of 3 left today')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explain my alignment' }));

    expect(await screen.findByText(explanation.overview)).toBeInTheDocument();
    expect(screen.getByText('Stocks overweight')).toBeInTheDocument();
    expect(screen.getByText('Tech cluster')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Cached today')).toBeInTheDocument();
    expect(screen.getByText(explanation.whatItMeans)).toBeInTheDocument();
  });

  it('shows quota and generate errors, including an invalid reset stamp', async () => {
    jest.mocked(fetchAlignmentExplanationQuota).mockRejectedValueOnce({});
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} />);
    expect(
      await screen.findByText(ERROR_MESSAGES.AI_ALIGNMENT_EXPLAIN_QUOTA_FAILED)
    ).toBeInTheDocument();
  });

  it('shows the daily limit when quota is exhausted', async () => {
    jest.mocked(fetchAlignmentExplanationQuota).mockResolvedValue({
      used: 3,
      limit: 3,
      remaining: 0,
      resetsAt: 'bad-date',
    });
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} />);

    expect(await screen.findByText(/Daily limit reached/)).toBeInTheDocument();
    expect(screen.getByText(/midnight UTC/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explain my alignment' })).toBeDisabled();
  });

  it('shows the quota skeleton while loading and recovers after a failed generate', async () => {
    jest.mocked(fetchAlignmentExplanationQuota).mockReturnValueOnce(new Promise(() => undefined));
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} />);
    expect(screen.getByLabelText(LOADING_MESSAGES.AI_QUOTA)).toBeInTheDocument();
  });

  it('generates, fails, and refreshes quota', async () => {
    jest.mocked(generateAlignmentExplanation).mockRejectedValueOnce({});
    const user = userEvent.setup();
    renderWithProviders(<AlignmentExplainPanel {...defaultProps} />);
    await screen.findByText('3 of 3 left today');

    await user.click(screen.getByRole('button', { name: 'Explain my alignment' }));
    expect(await screen.findByText(ERROR_MESSAGES.AI_ALIGNMENT_EXPLAIN_FAILED)).toBeInTheDocument();
    await waitFor(() => expect(fetchAlignmentExplanationQuota).toHaveBeenCalledTimes(2));
  });
});
