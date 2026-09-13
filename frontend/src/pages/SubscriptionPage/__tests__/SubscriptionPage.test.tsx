import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ERROR_MESSAGES, PADDLE_CHECKOUT_COMPLETED_EVENT, ROUTES } from '../../../constants';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { apiGetMe } from '../../../api/authApi';
import { apiCreateBillingCheckout, apiCreateBillingPortal } from '../../../api/billingApi';
import { handlePaddleCheckoutEvent, openPaddleCheckout } from '../../../utils/paddleCheckout';
import { SubscriptionPage } from '../SubscriptionPage';

jest.mock('../../../api/billingApi', () => ({
  apiCreateBillingCheckout: jest.fn(),
  apiCreateBillingPortal: jest.fn(),
}));

jest.mock('../../../api/authApi', () => ({
  apiGetMe: jest.fn(),
}));

jest.mock('../../../utils/paddleCheckout', () => {
  const actual = jest.requireActual(
    '../../../utils/paddleCheckout'
  ) as typeof import('../../../utils/paddleCheckout');
  return {
    ...actual,
    openPaddleCheckout: jest.fn(),
  };
});

describe('SubscriptionPage', () => {
  it('starts monthly checkout through Paddle', async () => {
    const user = userEvent.setup();
    jest.mocked(apiCreateBillingCheckout).mockResolvedValue({ transactionId: 'txn_1' });
    jest.mocked(openPaddleCheckout).mockResolvedValue(undefined);

    renderWithProviders(<SubscriptionPage />, { route: ROUTES.SUBSCRIPTION });

    expect(screen.getByRole('heading', { name: 'Subscription' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh status' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upgrade monthly' }));

    expect(apiCreateBillingCheckout).toHaveBeenCalledWith('month');
    expect(openPaddleCheckout).toHaveBeenCalledWith('txn_1');
    expect(screen.getByRole('status')).toHaveTextContent(ERROR_MESSAGES.BILLING_CHECKOUT_OPENED);
  });

  it('shows a red error banner at the bottom when checkout is unavailable', async () => {
    const user = userEvent.setup();
    jest.mocked(apiCreateBillingCheckout).mockRejectedValue(new Error(ERROR_MESSAGES.SERVER));

    renderWithProviders(<SubscriptionPage />, { route: ROUTES.SUBSCRIPTION });
    await user.click(screen.getByRole('button', { name: 'Upgrade monthly' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(ERROR_MESSAGES.SERVER);
    const vatNote = screen.getByText(/Prices shown before VAT/i);
    expect(vatNote.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('refreshes the signed-in user after Paddle confirms checkout', async () => {
    jest.mocked(apiGetMe).mockResolvedValue({
      ...testUser,
      subscription: {
        isPaid: true,
        plan: 'plus',
        interval: 'month',
        source: 'paddle',
        status: 'active',
        currentPeriodEnd: '2026-10-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
    });

    renderWithProviders(<SubscriptionPage />, { route: ROUTES.SUBSCRIPTION });
    handlePaddleCheckoutEvent({ name: PADDLE_CHECKOUT_COMPLETED_EVENT });

    await waitFor(() => {
      expect(apiGetMe).toHaveBeenCalled();
    });
    expect(await screen.findByText('Plus — $9 / month')).toBeInTheDocument();
  });

  it('opens the Paddle customer portal for an existing subscription', async () => {
    const user = userEvent.setup();
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    });
    jest.mocked(apiCreateBillingPortal).mockResolvedValue({
      url: 'https://paddle.example/portal',
    });

    renderWithProviders(<SubscriptionPage />, {
      route: ROUTES.SUBSCRIPTION,
      preloadedState: {
        auth: {
          user: {
            ...testUser,
            subscription: {
              isPaid: true,
              plan: 'plus',
              interval: 'month',
              source: 'paddle',
              status: 'active',
              currentPeriodEnd: '2026-10-01T00:00:00.000Z',
              cancelAtPeriodEnd: false,
            },
          },
          isLoading: false,
          error: null,
          isInitialized: true,
          pendingVerificationEmail: null,
          infoMessage: null,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Manage billing' }));

    expect(apiCreateBillingPortal).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://paddle.example/portal');
  });
});
