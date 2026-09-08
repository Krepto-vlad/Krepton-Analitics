import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROUTES } from '../../../../constants';
import { apiLogout } from '../../../../api/authApi';
import { renderWithProviders, testUser } from '../../../../__tests__/renderWithProviders';
import { AppSidebar } from '../AppSidebar';

jest.mock('../../../../api/authApi', () => ({
  ...jest.requireActual('../../../../api/authApi'),
  apiLogout: jest.fn(),
}));

describe('AppSidebar', () => {
  it('expands on hover, navigates, and logs out', async () => {
    const user = userEvent.setup();
    const onExpandedChange = jest.fn();
    jest.mocked(apiLogout).mockResolvedValue(undefined);

    renderWithProviders(<AppSidebar onExpandedChange={onExpandedChange} />, {
      route: ROUTES.DASHBOARD,
      preloadedState: {
        auth: {
          user: testUser,
          isLoading: false,
          error: null,
          isInitialized: true,
          pendingVerificationEmail: null,
          infoMessage: null,
        },
      },
    });

    await user.hover(screen.getByRole('complementary'));
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Portfolio' }));
    await user.click(screen.getByRole('button', { name: 'Open profile' }));
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(apiLogout).toHaveBeenCalled();
  });
});
