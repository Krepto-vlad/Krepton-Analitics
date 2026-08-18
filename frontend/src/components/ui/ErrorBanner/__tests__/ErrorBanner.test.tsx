import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from '../ErrorBanner';
import { ERROR_BANNER_DISMISS_LABEL } from '../../../../constants';

describe('ErrorBanner', () => {
  it('renders nothing when the message is empty', () => {
    const { container } = render(<ErrorBanner message="" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the error message to the user', () => {
    render(<ErrorBanner message="Unable to load portfolio data." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load portfolio data.');
  });

  it('calls onDismiss when the dismiss control is used', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();

    render(<ErrorBanner message="Request failed." onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: ERROR_BANNER_DISMISS_LABEL }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
