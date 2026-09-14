import { screen } from '@testing-library/react';
import { ROUTES } from '../../../constants';
import { renderWithProviders, testUser } from '../../../__tests__/renderWithProviders';
import { LegalDocumentsPage } from '../LegalDocumentsPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('LegalDocumentsPage', () => {
  it('lists official legal PDFs', () => {
    renderWithProviders(<LegalDocumentsPage />, { route: ROUTES.LEGAL });
    expect(screen.getByRole('heading', { name: 'Legal Documents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('hides marketing chrome when the user is already signed in', () => {
    renderWithProviders(<LegalDocumentsPage />, {
      route: ROUTES.LEGAL,
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

    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legal Documents' })).toBeInTheDocument();
  });
});
