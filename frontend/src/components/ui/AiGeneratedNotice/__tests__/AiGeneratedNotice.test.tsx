import { render, screen } from '@testing-library/react';
import { AiGeneratedNotice } from '../AiGeneratedNotice';
import { AI_GENERATED_LABEL } from '../../../../constants';

describe('AiGeneratedNotice', () => {
  it('renders the generated-content caveat', () => {
    render(<AiGeneratedNotice />);
    expect(screen.getByRole('note')).toHaveTextContent(AI_GENERATED_LABEL);
  });
});
