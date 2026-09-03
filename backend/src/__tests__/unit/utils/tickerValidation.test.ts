import { isValidTickerSymbol, normalizeTickerSymbol } from '../../../utils/tickerValidation.js';

describe('tickerValidation', () => {
  it('accepts standard equity tickers', () => {
    expect(isValidTickerSymbol('AAPL')).toBe(true);
    expect(isValidTickerSymbol('brk.b')).toBe(true);
  });

  it('accepts Yahoo futures and index symbols', () => {
    expect(isValidTickerSymbol('GC=F')).toBe(true);
    expect(isValidTickerSymbol('^GSPC')).toBe(true);
    expect(normalizeTickerSymbol('gc=f')).toBe('GC=F');
  });

  it('rejects unsupported ticker formats', () => {
    expect(isValidTickerSymbol('GC=F — Gold Aug 26')).toBe(false);
    expect(isValidTickerSymbol('')).toBe(false);
  });
});
