import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { SubscriptionPage } from '../SubscriptionPage';

describe('SubscriptionPage', () => {
  it('keeps the free plan and shows a demo notice for upgrades', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SubscriptionPage />, { route: ROUTES.SUBSCRIPTION });

    expect(screen.getByRole('heading', { name: 'Subscription' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upgrade to Pro' }));
    expect(screen.getByRole('status')).toHaveTextContent(/demo preview/i);
  });
});
