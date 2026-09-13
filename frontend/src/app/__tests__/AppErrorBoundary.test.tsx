import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { ERROR_BOUNDARY_RETRY_LABEL, ERROR_BOUNDARY_TITLE } from '../../constants';

function ExplodingChild(): ReactNode {
  throw new Error('Render boom');
}

function RecoverableChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Temporary render boom');
  }

  return <p>Dashboard recovered</p>;
}

describe('AppErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows a fallback instead of a blank screen when a child throws', () => {
    render(
      <AppErrorBoundary>
        <ExplodingChild />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: ERROR_BOUNDARY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(/Render boom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ERROR_BOUNDARY_RETRY_LABEL })).toBeInTheDocument();
  });

  it('remounts children after the user retries', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function FlakyChild() {
      return <RecoverableChild shouldThrow={shouldThrow} />;
    }

    render(
      <AppErrorBoundary>
        <FlakyChild />
      </AppErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: ERROR_BOUNDARY_RETRY_LABEL }));

    expect(screen.getByText('Dashboard recovered')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: ERROR_BOUNDARY_TITLE })).not.toBeInTheDocument();
  });
});
