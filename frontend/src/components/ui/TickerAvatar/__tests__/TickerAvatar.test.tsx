import { fireEvent, render, screen } from '@testing-library/react';
import { TickerAvatar } from '../TickerAvatar';

describe('TickerAvatar', () => {
  it('renders a logo and falls back to initials after every candidate fails', () => {
    const { rerender, container } = render(
      <TickerAvatar ticker="AAPL" logoUrl="https://example.com/aapl.png" />
    );
    const image = container.querySelector('img');
    expect(image).toBeTruthy();
    fireEvent.error(image as HTMLImageElement);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(screen.getByText('AA')).toBeInTheDocument();

    rerender(<TickerAvatar ticker="MSFT" size="sm" className="extra" />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('skips the FMP fallback for futures tickers', () => {
    render(<TickerAvatar ticker="GC=F" />);
    expect(screen.getByText('GC')).toBeInTheDocument();
  });
});
