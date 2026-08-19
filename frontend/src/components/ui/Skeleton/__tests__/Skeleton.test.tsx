import { render, screen } from '@testing-library/react';
import { LOADING_MESSAGES } from '../../../../constants';
import { ContentSkeleton, Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('hides the bare placeholder from assistive technology', () => {
    const { container } = render(<Skeleton />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('announces the pending fetch once per preset', () => {
    render(<ContentSkeleton preset="table" label={LOADING_MESSAGES.PORTFOLIO_TRANSACTIONS} />);

    const statusRegions = screen.getAllByRole('status');

    expect(statusRegions).toHaveLength(1);
    expect(statusRegions[0]).toHaveAccessibleName(LOADING_MESSAGES.PORTFOLIO_TRANSACTIONS);
    expect(statusRegions[0]).toHaveAttribute('aria-busy', 'true');
  });

  it('falls back to the default label', () => {
    render(<ContentSkeleton preset="list" />);

    expect(screen.getByRole('status')).toHaveAccessibleName(LOADING_MESSAGES.DEFAULT);
  });
});
