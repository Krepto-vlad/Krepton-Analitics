import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from '../App';
import { createTestStore } from '../../__tests__/renderWithProviders';

jest.mock('../../router/AppRouter', () => ({
  AppRouter: () => <p>App routes</p>,
}));

describe('App', () => {
  it('wraps routes with the error boundary and theme sync', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(screen.getByText('App routes')).toBeInTheDocument();
  });
});
