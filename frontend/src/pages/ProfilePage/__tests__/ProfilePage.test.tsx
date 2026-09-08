import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import {
  ACCOUNT_DELETE_CONFIRMATION,
  DEFAULT_PORTFOLIO_EXPORT_FORMAT,
  ERROR_MESSAGES,
  HOLDINGS_PAGE_SIZE,
  PORTFOLIO_DATA_DELETE_CONFIRMATION,
  ROUTES,
  TRANSACTIONS_PAGE_SIZE,
} from '../../../constants';
import { PRICING_PLAN_DEFINITIONS } from '../../../constants/pricingPlans';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { apiChangePassword, apiDeleteAccount, apiGetMe, apiLogout } from '../../../api/authApi';
import {
  deletePortfolioData,
  exportPortfolioData,
  fetchInvestmentSummary,
  fetchPortfolioEquityHistory,
  fetchPortfolioNews,
  fetchPortfolioPositions,
  fetchPortfolioPositionsPage,
  fetchPortfolioRebalancing,
  fetchPortfolioTransactionsPage,
} from '../../../api/portfolioApi';
import { fetchWatchlistItems } from '../../../api/watchlistApi';
import { fetchStockQuotesBatch } from '../../../api/stockApi';
import { fetchLiveFxRates } from '../../../api/fxApi';
import { clearPersistedAlignmentExplanation } from '../../../utils/alignmentExplainStorage';
import { clearPersistedNewsBriefing } from '../../../utils/newsBriefingStorage';
import { ProfilePage } from '../ProfilePage';

const GOOGLE_ID_TOKEN = 'google-step-up-token';
const CURRENT_PASSWORD = 'OldPassword1!';
const STRONG_PASSWORD = 'NewPassword1!';
const WEAK_PASSWORD = 'short';
const EXPORT_FILE_NAME = 'krepton-portfolio-export.xlsx';

jest.mock('../../../components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: ({
    onCredential,
    onError,
    disabled,
  }: {
    onCredential: (idToken: string) => void;
    onError?: () => void;
    disabled?: boolean;
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={() => onCredential(GOOGLE_ID_TOKEN)}>
        Continue with Google
      </button>
      <button type="button" onClick={() => onError?.()}>
        Google error
      </button>
    </div>
  ),
}));

jest.mock('../../../api/authApi', () => ({
  apiChangePassword: jest.fn(),
  apiDeleteAccount: jest.fn(),
  apiGetMe: jest.fn(),
  apiLogout: jest.fn(),
}));

jest.mock('../../../api/portfolioApi', () => ({
  deletePortfolioData: jest.fn(),
  exportPortfolioData: jest.fn(),
  fetchInvestmentSummary: jest.fn(),
  fetchPortfolioEquityHistory: jest.fn(),
  fetchPortfolioNews: jest.fn(),
  fetchPortfolioPositions: jest.fn(),
  fetchPortfolioPositionsPage: jest.fn(),
  fetchPortfolioRebalancing: jest.fn(),
  fetchPortfolioTransactionsPage: jest.fn(),
}));

jest.mock('../../../api/watchlistApi', () => ({
  fetchWatchlistItems: jest.fn(),
}));

jest.mock('../../../api/stockApi', () => ({
  fetchStockQuotesBatch: jest.fn(),
}));

jest.mock('../../../api/fxApi', () => ({
  fetchLiveFxRates: jest.fn(),
}));

jest.mock('../../../utils/alignmentExplainStorage', () => ({
  clearPersistedAlignmentExplanation: jest.fn(),
}));

jest.mock('../../../utils/newsBriefingStorage', () => ({
  clearPersistedNewsBriefing: jest.fn(),
}));

jest.mock('../../../utils/strategyDriftAlertStorage', () => ({
  clearStrategyDriftAlertDismissal: jest.fn(),
}));

function mockPortfolioRefreshApis() {
  jest.mocked(fetchPortfolioPositions).mockResolvedValue([]);
  jest.mocked(fetchPortfolioPositionsPage).mockResolvedValue({
    items: [],
    total: 0,
    limit: HOLDINGS_PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  jest.mocked(fetchPortfolioTransactionsPage).mockResolvedValue({
    items: [],
    total: 0,
    limit: TRANSACTIONS_PAGE_SIZE,
    offset: 0,
    hasMore: false,
  });
  jest.mocked(fetchInvestmentSummary).mockResolvedValue({ totalInvested: 0, totalWithdrawn: 0 });
  jest.mocked(fetchPortfolioEquityHistory).mockResolvedValue([]);
  jest.mocked(fetchPortfolioNews).mockResolvedValue([]);
  jest.mocked(fetchPortfolioRebalancing).mockResolvedValue({
    strategyId: 'custom',
    strategyName: 'Custom',
    strategyDescription: 'Custom mix',
    strategyPhilosophy: 'Stay invested',
    investmentHorizon: 'Long term',
    customBaseStrategyId: null,
    savedCustomStrategy: null,
    displayCurrency: 'USD',
    alignmentScore: 80,
    totalPortfolioValue: 0,
    currentAllocations: [],
    targetAllocations: [],
    deviations: [],
    tickerMappings: [],
  });
  jest.mocked(fetchWatchlistItems).mockResolvedValue([]);
  jest.mocked(fetchStockQuotesBatch).mockResolvedValue([]);
  jest.mocked(fetchLiveFxRates).mockResolvedValue({ USD: 1, EUR: 1 });
}

function renderProfile(user = testUser) {
  return renderWithProviders(
    <Routes>
      <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      <Route path={ROUTES.LOGIN} element={<p>Signed out</p>} />
    </Routes>,
    {
      route: ROUTES.PROFILE,
      preloadedState: {
        auth: { user, isLoading: false, error: null, isInitialized: true } as never,
      },
    }
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPortfolioRefreshApis();
    jest.mocked(apiGetMe).mockResolvedValue(testUser);
    jest.mocked(apiLogout).mockResolvedValue(undefined);
    jest.mocked(apiChangePassword).mockResolvedValue(undefined);
    jest.mocked(apiDeleteAccount).mockResolvedValue(undefined);
    jest.mocked(exportPortfolioData).mockResolvedValue({ fileName: EXPORT_FILE_NAME });
    jest.mocked(deletePortfolioData).mockResolvedValue({
      deletedPositions: 2,
      deletedTransactions: 4,
      deletedWatchlistItems: 1,
    });
  });

  it('renders nothing without a signed-in user', () => {
    const { container } = renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: { user: null, isLoading: false, error: null, isInitialized: true } as never,
      },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows account overview, free-plan features, and legal links', () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profile Overview' })).toBeInTheDocument();
    expect(screen.getByText('Free plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Password' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage subscription' })).toHaveAttribute(
      'href',
      ROUTES.SUBSCRIPTION
    );
    expect(screen.getByRole('link', { name: 'Legal Documents' })).toHaveAttribute(
      'href',
      ROUTES.LEGAL
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      ROUTES.PRIVACY
    );
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      ROUTES.TERMS
    );

    const freePlan = PRICING_PLAN_DEFINITIONS.find((plan) => plan.id === 'free');
    expect(freePlan).toBeDefined();
    expect(screen.getByText(freePlan!.features[0])).toBeInTheDocument();
  });

  it('changes the password after current-password confirmation', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Change Password' }));
    await user.type(screen.getByPlaceholderText('Your current password'), CURRENT_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByPlaceholderText('Your current password')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    await user.type(
      screen.getByPlaceholderText('Min. 10 chars, uppercase, number, symbol'),
      WEAK_PASSWORD
    );
    expect(screen.getByText('At least 10 characters')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Min. 10 chars, uppercase, number, symbol'));
    await user.type(
      screen.getByPlaceholderText('Min. 10 chars, uppercase, number, symbol'),
      STRONG_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Repeat your new password'), 'Mismatch1!');
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Repeat your new password'));
    await user.type(screen.getByPlaceholderText('Repeat your new password'), STRONG_PASSWORD);
    expect(screen.getByText('Passwords match ✓')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(apiChangePassword).toHaveBeenCalledWith({
        newPassword: STRONG_PASSWORD,
        password: CURRENT_PASSWORD,
        googleIdToken: undefined,
      });
    });
    expect(apiGetMe).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Change password' })).not.toBeInTheDocument();
  });

  it('shows a password-change error and can cancel the modal', async () => {
    const user = userEvent.setup();
    jest.mocked(apiChangePassword).mockRejectedValue({});
    renderProfile();

    await user.click(screen.getByRole('button', { name: 'Change Password' }));
    await user.type(screen.getByPlaceholderText('Your current password'), CURRENT_PASSWORD);
    await user.type(
      screen.getByPlaceholderText('Min. 10 chars, uppercase, number, symbol'),
      STRONG_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Repeat your new password'), STRONG_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_CHANGE_PASSWORD_FAILED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sets a password with Google confirmation for a Google-only account', async () => {
    const user = userEvent.setup();
    const googleOnlyUser = { ...testUser, hasPassword: false, hasGoogle: true };
    renderProfile(googleOnlyUser);

    await user.click(screen.getByRole('button', { name: 'Set Password' }));
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(screen.getByText('Google confirmation ready.')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Min. 10 chars, uppercase, number, symbol'),
      STRONG_PASSWORD
    );
    await user.type(screen.getByPlaceholderText('Repeat your new password'), STRONG_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(apiChangePassword).toHaveBeenCalledWith({
        newPassword: STRONG_PASSWORD,
        password: undefined,
        googleIdToken: GOOGLE_ID_TOKEN,
      });
    });
  });

  it('reports a Google step-up failure in the password modal', async () => {
    const user = userEvent.setup();
    renderProfile({ ...testUser, hasGoogle: true });

    await user.click(screen.getByRole('button', { name: 'Change Password' }));
    await user.click(screen.getByRole('button', { name: 'Google error' }));

    expect(screen.getByText(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)).toBeInTheDocument();
  });

  it('exports portfolio data as Excel then JSON', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /Export my data/ }));
    expect(screen.getByRole('dialog', { name: 'Export portfolio data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Excel' })).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Enter your password'), CURRENT_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    await user.click(screen.getByRole('button', { name: 'Download Excel' }));

    await waitFor(() => {
      expect(exportPortfolioData).toHaveBeenCalledWith(
        { password: CURRENT_PASSWORD, googleIdToken: undefined },
        DEFAULT_PORTFOLIO_EXPORT_FORMAT
      );
    });
    expect(
      await screen.findByText(`Downloaded ${EXPORT_FILE_NAME}. Keep the file private.`)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Export my data/ }));
    await user.click(screen.getByRole('button', { name: 'JSON' }));
    await user.type(screen.getByPlaceholderText('Enter your password'), CURRENT_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Download JSON' }));

    await waitFor(() => {
      expect(exportPortfolioData).toHaveBeenLastCalledWith(
        { password: CURRENT_PASSWORD, googleIdToken: undefined },
        'json'
      );
    });
  });

  it('shows an export error and Google confirmation', async () => {
    const user = userEvent.setup();
    jest.mocked(exportPortfolioData).mockRejectedValueOnce({});
    renderProfile({ ...testUser, hasGoogle: true });

    await user.click(screen.getByRole('button', { name: /Export my data/ }));
    await user.click(screen.getByRole('button', { name: 'Google error' }));
    expect(screen.getByText(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await user.click(screen.getByRole('button', { name: 'Download Excel' }));
    expect(await screen.findByText(ERROR_MESSAGES.PORTFOLIO_EXPORT_FAILED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Export portfolio data' })).not.toBeInTheDocument();
  });

  it('wipes portfolio data after confirmation', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /Wipe portfolio/ }));
    expect(screen.getByRole('button', { name: /Delete forever/ })).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(PORTFOLIO_DATA_DELETE_CONFIRMATION),
      PORTFOLIO_DATA_DELETE_CONFIRMATION
    );
    await user.click(screen.getByRole('button', { name: /Delete forever/ }));

    await waitFor(() => {
      expect(deletePortfolioData).toHaveBeenCalledWith(PORTFOLIO_DATA_DELETE_CONFIRMATION);
    });
    expect(clearPersistedNewsBriefing).toHaveBeenCalled();
    expect(clearPersistedAlignmentExplanation).toHaveBeenCalled();
    expect(
      await screen.findByText('Deleted 2 positions, 4 transactions, and 1 watchlist items.')
    ).toBeInTheDocument();
  });

  it('shows a portfolio wipe error', async () => {
    const user = userEvent.setup();
    jest.mocked(deletePortfolioData).mockRejectedValue({});
    renderProfile();

    await user.click(screen.getByRole('button', { name: /Wipe portfolio/ }));
    await user.type(
      screen.getByPlaceholderText(PORTFOLIO_DATA_DELETE_CONFIRMATION),
      PORTFOLIO_DATA_DELETE_CONFIRMATION
    );
    await user.click(screen.getByRole('button', { name: /Delete forever/ }));

    expect(
      await screen.findByText(ERROR_MESSAGES.PORTFOLIO_DELETE_DATA_FAILED)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('deletes the account and redirects to login', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole('button', { name: /Delete my account/ }));
    const deleteAccountDialog = screen.getByRole('dialog', { name: 'Delete account' });
    await user.type(
      within(deleteAccountDialog).getByPlaceholderText('Your password'),
      CURRENT_PASSWORD
    );
    await user.click(within(deleteAccountDialog).getByRole('button', { name: 'Show password' }));
    await user.type(
      within(deleteAccountDialog).getByPlaceholderText(ACCOUNT_DELETE_CONFIRMATION),
      ACCOUNT_DELETE_CONFIRMATION
    );
    await user.click(
      within(deleteAccountDialog).getByRole('button', { name: /Delete my account/ })
    );

    await waitFor(() => {
      expect(apiDeleteAccount).toHaveBeenCalledWith({
        confirm: ACCOUNT_DELETE_CONFIRMATION,
        password: CURRENT_PASSWORD,
        googleIdToken: undefined,
      });
    });
    expect(clearPersistedNewsBriefing).toHaveBeenCalled();
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('shows an account-delete error and Google step-up failure', async () => {
    const user = userEvent.setup();
    jest.mocked(apiDeleteAccount).mockRejectedValue({});
    renderProfile({ ...testUser, hasGoogle: true });

    await user.click(screen.getByRole('button', { name: /Delete my account/ }));
    const deleteAccountDialog = screen.getByRole('dialog', { name: 'Delete account' });
    await user.click(within(deleteAccountDialog).getByRole('button', { name: 'Google error' }));
    expect(screen.getByText(ERROR_MESSAGES.AUTH_GOOGLE_STEP_UP_FAILED)).toBeInTheDocument();

    await user.click(
      within(deleteAccountDialog).getByRole('button', { name: 'Continue with Google' })
    );
    await user.type(
      within(deleteAccountDialog).getByPlaceholderText(ACCOUNT_DELETE_CONFIRMATION),
      ACCOUNT_DELETE_CONFIRMATION
    );
    await user.click(
      within(deleteAccountDialog).getByRole('button', { name: /Delete my account/ })
    );

    expect(await screen.findByText(ERROR_MESSAGES.AUTH_DELETE_ACCOUNT_FAILED)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete account' })).not.toBeInTheDocument();
  });
});
