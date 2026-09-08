import { screen } from '@testing-library/react';
import { ROUTES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
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
  });
});
