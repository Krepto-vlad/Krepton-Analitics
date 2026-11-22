import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('shows a hint and reports typed values', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Input id="email" label="Email" hint="Work email" onChange={onChange} />);
    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Work email');
  });

  it('shows an error instead of the hint', () => {
    render(<Input id="email" label="Email" hint="hint" error="Required" onChange={jest.fn()} />);
    const field = screen.getByLabelText('Email');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Required');
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });
});
