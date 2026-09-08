import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NOT_FOUND_TITLE } from '../../../constants';
import { NotFoundPage } from '../NotFoundPage';

jest.mock('../../../hooks/usePageSeo', () => ({
  usePageSeo: jest.fn(),
}));

describe('NotFoundPage', () => {
  it('explains that the page is missing and offers a home link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: NOT_FOUND_TITLE })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });
});
