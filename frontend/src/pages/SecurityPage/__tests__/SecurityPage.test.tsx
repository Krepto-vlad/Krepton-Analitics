import { screen } from '@testing-library/react';
import { ROUTES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { SecurityPage } from '../SecurityPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('SecurityPage', () => {
  it('explains the privacy and encryption pillars', () => {
    renderWithProviders(<SecurityPage />, { route: ROUTES.SECURITY });
    expect(screen.getByText(/Zero-Identity by Design/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only through SnapTrade/i)).toBeInTheDocument();
    expect(screen.queryByText(/No bank connections/i)).not.toBeInTheDocument();
  });
});
