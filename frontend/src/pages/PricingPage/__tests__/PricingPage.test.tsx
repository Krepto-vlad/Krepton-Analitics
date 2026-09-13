import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ROUTES } from '../../../constants';
import { createTestStore } from '../../../__tests__/renderWithProviders';
import { PricingPage } from '../PricingPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('PricingPage', () => {
  it('shows plans and sends visitors to register', async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[ROUTES.PRICING]}>
          <Routes>
            <Route path={ROUTES.PRICING} element={<PricingPage />} />
            <Route path={ROUTES.REGISTER} element={<p>Register</p>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByRole('heading', { name: /Transparent/i })).toBeInTheDocument();
    await user.click(
      screen.getAllByRole('button', {
        name: /Get started free|Start Plus monthly|Start Plus annual/i,
      })[0]
    );
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});
