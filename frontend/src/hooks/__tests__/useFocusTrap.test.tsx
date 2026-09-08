import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from '../useFocusTrap';

function TrapHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: dialogRef,
    isActive: isOpen,
    onEscape: () => setIsOpen(false),
    lockBodyScroll: false,
  });

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      <button type="button">Outside control</button>
      {isOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Example dialog"
          tabIndex={-1}
        >
          <button type="button">First</button>
          <button type="button">Last</button>
        </div>
      ) : null}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('moves focus into the dialog and keeps Tab inside it', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(screen.getByRole('dialog')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);

    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
