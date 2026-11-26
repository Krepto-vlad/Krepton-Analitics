import { screen } from '@testing-library/react';
import { Briefcase } from 'lucide-react';
import { ROUTES } from '../../../constants';
import { renderWithProviders } from '../../../__tests__/renderWithProviders';
import { PanelEmptyState } from '../PanelEmptyState';

describe('PanelEmptyState', () => {
  it('shows the empty-state action when idle', () => {
    renderWithProviders(
      <PanelEmptyState
        icon={<Briefcase />}
        title="No positions yet"
        description="Add a holding"
        actionLabel="Add Position"
        actionTo={`${ROUTES.PORTFOLIO}?section=positions`}
      />
    );

    expect(screen.getByRole('heading', { name: 'No positions yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Position/i })).toBeInTheDocument();
  });

  it('shows a loading skeleton while fetching', () => {
    renderWithProviders(
      <PanelEmptyState
        isLoading
        icon={<Briefcase />}
        title="No positions yet"
        description="Add a holding"
        actionLabel="Add Position"
        actionTo={ROUTES.PORTFOLIO}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
