import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../Footer';
import { LEGAL_CONTACT_EMAIL } from '../../../../constants';

describe('Footer', () => {
  it('renders product links and the contact email', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: LEGAL_CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${LEGAL_CONTACT_EMAIL}`
    );
  });
});
