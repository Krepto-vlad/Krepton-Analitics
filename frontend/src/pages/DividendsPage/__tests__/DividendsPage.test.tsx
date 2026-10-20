import { screen } from '@testing-library/react';
import { fetchPortfolioDividends, fetchPortfolioPositions } from '../../../api/portfolioApi';
import { ERROR_MESSAGES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { loadChatScreenContext, saveDividendsChatScreen } from '../../../utils/tickerChatSession';
import { DividendsPage } from '../DividendsPage';

jest.mock('../../../api/portfolioApi', () => {
  const actual = jest.requireActual('../../../api/portfolioApi');
  return {
    ...actual,
    fetchPortfolioDividends: jest.fn(),
    fetchPortfolioPositions: jest.fn(),
  };
});

const calendar = {
  displayCurrency: 'USD',
  chartYear: 2026,
  summary: { annualIncome: 120, avgMonthlyIncome: 10, remainingYearIncome: 40 },
  monthlyPayouts: [],
  upcomingPayments: [],
};

describe('DividendsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    jest.mocked(fetchPortfolioPositions).mockResolvedValue([]);
  });

  it('saves the loaded calendar for chat', async () => {
    jest.mocked(fetchPortfolioDividends).mockResolvedValue(calendar);
    renderWithProviders(<DividendsPage />);

    expect(await screen.findByText('Annual Income')).toBeInTheDocument();
    expect(loadChatScreenContext()).toEqual({ kind: 'dividends', displayCurrency: 'USD' });
    expect(fetchPortfolioDividends).toHaveBeenCalledWith('USD');
  });

  it('clears a saved dividend screen when the calendar fails to load', async () => {
    saveDividendsChatScreen('USD');
    jest.mocked(fetchPortfolioDividends).mockRejectedValue({});
    renderWithProviders(<DividendsPage />);

    expect(await screen.findByText(ERROR_MESSAGES.DIVIDEND_CALENDAR_FAILED)).toBeInTheDocument();
    expect(loadChatScreenContext()).toBeNull();
  });
});
