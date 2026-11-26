import { isMarketIndexTicker, resolveTickerFromRouteParam } from '../tickerRoute';

describe('resolveTickerFromRouteParam', () => {
  it('decodes percent-encoded index symbols and normalizes case', () => {
    expect(resolveTickerFromRouteParam('%5Egspc')).toBe('^GSPC');
  });

  it('returns an empty string for malformed encoding', () => {
    expect(resolveTickerFromRouteParam('%E0%A4%A')).toBe('');
  });
});

describe('isMarketIndexTicker', () => {
  it('detects Yahoo index symbols', () => {
    expect(isMarketIndexTicker('^GSPC')).toBe(true);
    expect(isMarketIndexTicker('AAPL')).toBe(false);
  });
});
