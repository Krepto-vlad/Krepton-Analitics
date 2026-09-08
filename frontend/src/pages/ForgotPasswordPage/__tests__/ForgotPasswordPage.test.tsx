import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ERROR_MESSAGES } from '../../../constants';
import { apiForgotPassword } from '../../../api/authApi';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

jest.mock('../../../api/authApi', () => ({
  apiForgotPassword: jest.fn(),
}));

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('ForgotPasswordPage', () => {
  it('sends a reset link and shows the API message', async () => {
    const user = userEvent.setup();
    jest.mocked(apiForgotPassword).mockResolvedValue({ message: 'Check your inbox' });
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), 'investor@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
  });

  it('shows an error when the request fails', async () => {
    const user = userEvent.setup();
    jest.mocked(apiForgotPassword).mockRejectedValue(new Error('down'));
    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText('Email'), 'investor@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('down')).toBeInTheDocument();
    expect(ERROR_MESSAGES.AUTH_FORGOT_PASSWORD_FAILED).toBeTruthy();
  });
});
