import { buildLogoByTicker } from '../tickerLogos';

describe('buildLogoByTicker', () => {
  it('keeps the first logo for a ticker and ignores later duplicates', () => {
    const logos = buildLogoByTicker(
      [{ ticker: 'aapl', logoUrl: 'first.png' }],
      [
        { ticker: 'AAPL', logoUrl: 'second.png' },
        { ticker: 'MSFT', logoUrl: null },
      ]
    );

    expect(logos).toEqual({ AAPL: 'first.png', MSFT: null });
  });
});
