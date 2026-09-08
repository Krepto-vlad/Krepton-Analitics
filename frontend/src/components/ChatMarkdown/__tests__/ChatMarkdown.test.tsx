import { render, screen } from '@testing-library/react';
import { ChatMarkdown } from '../ChatMarkdown';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components?: { a?: (props: { children: string }) => React.ReactNode };
  }) => (
    <div>
      {children}
      {components?.a ? components.a({ children: 'site' }) : null}
    </div>
  ),
}));

describe('ChatMarkdown', () => {
  it('renders markdown content and replaces anchors with text', () => {
    render(<ChatMarkdown content="Hello" />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText('site')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
