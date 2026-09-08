import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ROUTES } from '../../../constants';
import { createTestStore, testUser } from '../../../__tests__/renderWithProviders';
import { VerifyEmailPage } from '../VerifyEmailPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('VerifyEmailPage', () => {
  it('explains a missing token', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[ROUTES.VERIFY_EMAIL]}>
          <Routes>
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/missing a token/i)).toBeInTheDocument();
  });

  it('redirects after a successful verification', () => {
    const store = createTestStore({
      auth: {
        user: testUser,
        isLoading: false,
        error: null,
        isInitialized: true,
        pendingVerificationEmail: null,
        infoMessage: null,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`${ROUTES.VERIFY_EMAIL}?token=abc`]}>
          <Routes>
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
            <Route path={ROUTES.DASHBOARD} element={<p>Dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
