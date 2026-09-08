import { render, screen } from '@testing-library/react';
import { ContentSkeleton, Skeleton } from '../Skeleton';

const presets = [
  'list',
  'table',
  'news',
  'chart',
  'stats',
  'cards',
  'page',
  'movers',
  'compare',
] as const;

describe('ContentSkeleton presets', () => {
  it.each(presets)('renders the %s preset', (preset) => {
    render(<ContentSkeleton preset={preset} label={`${preset} loading`} />);
    expect(screen.getByRole('status')).toHaveAccessibleName(`${preset} loading`);
  });

  it('supports every radius on the primitive', () => {
    const { container } = render(
      <>
        <Skeleton radius="sm" />
        <Skeleton radius="lg" />
        <Skeleton radius="full" />
      </>
    );
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
