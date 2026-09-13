import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../constants';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { apiGrantAdminEntitlement, apiLookupAdminEntitlement } from '../../../api/billingApi';
import { AdminPage } from '../AdminPage';

jest.mock('../../../api/billingApi', () => ({
  apiGrantAdminEntitlement: jest.fn(),
  apiLookupAdminEntitlement: jest.fn(),
}));

describe('AdminPage', () => {
  it('grants complimentary Plus', async () => {
    const user = userEvent.setup();
    jest.mocked(apiGrantAdminEntitlement).mockResolvedValue({
      email: 'friend@example.com',
      expiresAt: '2026-12-01T00:00:00.000Z',
      isPaid: true,
    });

    renderWithProviders(<AdminPage />, {
      route: ROUTES.ADMIN,
      preloadedState: {
        auth: {
          user: { ...testUser, isAdmin: true },
          isLoading: false,
          error: null,
          isInitialized: true,
          pendingVerificationEmail: null,
          infoMessage: null,
        },
      },
    });

    await user.type(screen.getByLabelText('Email'), 'friend@example.com');
    await user.type(screen.getByLabelText('Access until'), '2026-12-01T12:00');
    await user.click(screen.getByRole('button', { name: 'Grant Plus' }));

    expect(apiGrantAdminEntitlement).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/Granted Plus/i);
  });

  it('looks up an existing grant by email', async () => {
    const user = userEvent.setup();
    jest.mocked(apiLookupAdminEntitlement).mockResolvedValue({
      email: 'friend@example.com',
      expiresAt: '2026-12-01T00:00:00.000Z',
      isPaid: true,
    });

    renderWithProviders(<AdminPage />, {
      route: ROUTES.ADMIN,
      preloadedState: {
        auth: {
          user: { ...testUser, isAdmin: true },
          isLoading: false,
          error: null,
          isInitialized: true,
          pendingVerificationEmail: null,
          infoMessage: null,
        },
      },
    });

    await user.type(screen.getByLabelText('Email'), 'friend@example.com');
    await user.click(screen.getByRole('button', { name: 'Look up' }));

    expect(apiLookupAdminEntitlement).toHaveBeenCalledWith('friend@example.com');
    expect(screen.getByRole('status')).toHaveTextContent(/has Plus until/i);
  });
});
