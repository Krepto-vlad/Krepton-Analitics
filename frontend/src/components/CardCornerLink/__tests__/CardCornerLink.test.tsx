import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { CardCornerLink } from '../CardCornerLink';

describe('CardCornerLink', () => {
  it('exposes one named link to the related page', () => {
    renderWithProviders(<CardCornerLink to="/rebalancing" label="Open rebalancing" />);

    const link = screen.getByRole('link', { name: 'Open rebalancing' });
    expect(link).toHaveAttribute('href', '/rebalancing');
    expect(link).toHaveAttribute('title', 'Open rebalancing');
  });

  it('hides the arrow icon from assistive technology', () => {
    renderWithProviders(<CardCornerLink to="/rebalancing" label="Open rebalancing" />);

    const icon = screen.getByRole('link', { name: 'Open rebalancing' }).querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('can be reached with the keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CardCornerLink to="/rebalancing" label="Open rebalancing" />);

    await user.tab();

    expect(screen.getByRole('link', { name: 'Open rebalancing' })).toHaveFocus();
  });
});
