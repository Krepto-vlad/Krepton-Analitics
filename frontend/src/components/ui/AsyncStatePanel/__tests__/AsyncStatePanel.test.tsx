import { render, screen } from '@testing-library/react';
import { LOADING_MESSAGES } from '../../../../constants';
import { AsyncStatePanel } from '../AsyncStatePanel';

describe('AsyncStatePanel', () => {
  it('shows a skeleton placeholder while loading', () => {
    render(<AsyncStatePanel isLoading loadingMessage={LOADING_MESSAGES.PORTFOLIO_HOLDINGS} />);

    expect(
      screen.getByRole('status', { name: LOADING_MESSAGES.PORTFOLIO_HOLDINGS })
    ).toBeInTheDocument();
    expect(screen.queryByText('Ready content')).not.toBeInTheDocument();
  });

  it('shows a spinner when the spinner preset is requested', () => {
    render(
      <AsyncStatePanel
        isLoading
        loadingPreset="spinner"
        loadingMessage={LOADING_MESSAGES.DEFAULT}
      />
    );

    expect(screen.getByRole('status', { name: LOADING_MESSAGES.DEFAULT })).toHaveTextContent(
      LOADING_MESSAGES.DEFAULT
    );
  });

  it('renders children after loading completes', () => {
    render(
      <AsyncStatePanel isLoading={false}>
        <p>Ready content</p>
      </AsyncStatePanel>
    );

    expect(screen.getByText('Ready content')).toBeInTheDocument();
  });
});
