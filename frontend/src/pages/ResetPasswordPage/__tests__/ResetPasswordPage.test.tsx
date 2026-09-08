import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { apiResetPassword } from '../../../api/authApi';
import { ROUTES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { ResetPasswordPage } from '../ResetPasswordPage';

jest.mock('../../../api/authApi', () => ({
  apiResetPassword: jest.fn(),
}));

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

const strongPassword = 'Abcdefgh1!';

describe('ResetPasswordPage', () => {
  it('asks for a new reset link when the token is missing', () => {
    renderWithProviders(<ResetPasswordPage />, { route: ROUTES.RESET_PASSWORD });
    expect(screen.getByText(/missing a token/i)).toBeInTheDocument();
  });

  it('updates the password when the form is valid', async () => {
    const user = userEvent.setup();
    jest.mocked(apiResetPassword).mockResolvedValue({ message: 'Password updated' });

    render(
      <MemoryRouter initialEntries={[`${ROUTES.RESET_PASSWORD}?token=reset-token`]}>
        <Routes>
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('New password'), strongPassword);
    await user.type(screen.getByLabelText('Confirm new password'), strongPassword);
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
  });
});
