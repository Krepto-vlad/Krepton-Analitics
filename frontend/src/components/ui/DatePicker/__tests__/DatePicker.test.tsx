import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '../DatePicker';

describe('DatePicker', () => {
  it('selects a date, then clears it', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DatePicker label="Entry date" value="2026-09-08" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Entry date' }));
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2026-09-01' }));
    expect(onChange).toHaveBeenCalledWith('2026-09-01');
  });

  it('navigates months, picks today, and closes on Escape', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DatePicker
        id="sale-date"
        label="Sale date"
        value=""
        onChange={onChange}
        placeholder="Pick a day"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Sale date' }));
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Sale date' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Choose date' })).not.toBeInTheDocument();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Locked" value="2026-01-01" onChange={jest.fn()} disabled />);
    await user.click(screen.getByRole('button'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears the current value from the footer', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<DatePicker label="Entry date" value="2026-09-08" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Entry date' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('uses the max date as the initial view when value is empty', async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Until" value="" max="2024-02-10" onChange={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Until' }));
    expect(screen.getByText(/February 2024/i)).toBeInTheDocument();
  });
});
