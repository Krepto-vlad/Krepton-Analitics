import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../__tests__/renderWithProviders';
import { ImportResultModal } from '../ImportResultModal';

describe('ImportResultModal', () => {
  it('does not render when closed', () => {
    const { container } = renderWithProviders(
      <ImportResultModal
        isOpen={false}
        type="success"
        title="Imported"
        message="Done"
        onClose={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('closes a successful import from the overlay and the confirm button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderWithProviders(
      <ImportResultModal
        isOpen
        type="success"
        title="Imported"
        message="12 rows"
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { name: 'Imported' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the error close label', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderWithProviders(
      <ImportResultModal
        isOpen
        type="error"
        title="Failed"
        message="Parse error"
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
