import { screen } from '@testing-library/react';
import { Briefcase } from 'lucide-react';
import { ROUTES } from '../../../../../constants';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { DashboardPanelEmptyState } from '../DashboardPanelEmptyState';

describe('DashboardPanelEmptyState', () => {
  it('shows the empty-state action when idle', () => {
    renderWithProviders(
      <DashboardPanelEmptyState
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
      <DashboardPanelEmptyState
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
