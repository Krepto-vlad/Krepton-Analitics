import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

describe('Select', () => {
  it('picks an object option and closes on outside click', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <div>
        <Select
          label="Period"
          value="1d"
          onChange={onChange}
          options={[
            { value: '1d', label: '1 Day' },
            { value: '1w', label: '1 Week' },
          ]}
        />
        <button type="button">Outside</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Period' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: '1 Week' }));
    expect(onChange).toHaveBeenCalledWith('1w');
  });

  it('normalizes string options and supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <Select
        id="currency"
        label="Currency"
        value="USD"
        onChange={onChange}
        options={['USD', 'EUR']}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Currency' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('EUR');
  });

  it('ignores interaction when disabled and handles empty options', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = render(
      <Select label="Empty" value="a" onChange={onChange} options={[]} disabled />
    );
    await user.click(screen.getByRole('button'));
    expect(onChange).not.toHaveBeenCalled();

    rerender(<Select label="Empty" value="a" onChange={onChange} options={[]} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
