import { render } from '@testing-library/react';
import { usePageSeo } from '../usePageSeo';

function Harness({ noIndex }: { noIndex?: boolean }) {
  usePageSeo({
    title: 'Ticker page',
    description: 'Quote details',
    noIndex,
    structuredData: { '@type': 'WebPage' },
  });
  return <p>page</p>;
}

describe('usePageSeo', () => {
  it('sets title, description, social tags, canonical, robots, and JSON-LD', () => {
    const { unmount } = render(<Harness noIndex />);

    expect(document.title).toBe('Ticker page');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Quote details'
    );
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(
      /noindex/
    );
    expect(document.querySelector('link[rel="canonical"]')).toBeTruthy();
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      'WebPage'
    );

    unmount();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
