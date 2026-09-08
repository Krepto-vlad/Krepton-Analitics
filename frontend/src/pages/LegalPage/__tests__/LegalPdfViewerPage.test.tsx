import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ROUTES } from '../../../constants';
import { createTestStore } from '../../../__tests__/renderWithProviders';
import { LegalPdfViewerPage } from '../LegalPdfViewerPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

function renderViewer(path: string) {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={ROUTES.LEGAL_DOCUMENT} element={<LegalPdfViewerPage />} />
          <Route path={ROUTES.LEGAL} element={<p>Legal index</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('LegalPdfViewerPage', () => {
  it('renders a known document in the PDF viewer', () => {
    renderViewer('/legal/privacy-policy');
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByTitle('Privacy Policy')).toBeInTheDocument();
  });

  it('redirects unknown documents back to the legal index', () => {
    renderViewer('/legal/unknown-doc');
    expect(screen.getByText('Legal index')).toBeInTheDocument();
  });
});
