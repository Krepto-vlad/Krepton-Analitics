import { render, screen } from '@testing-library/react';

// Stub component — replace with real import when component is implemented
const DashboardPage = () => <div data-testid="dashboard">Dashboard</div>;

describe('DashboardPage', () => {
  it('renders without crashing', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
