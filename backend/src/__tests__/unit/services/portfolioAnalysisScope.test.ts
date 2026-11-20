import { isTickerOutsideAnalysis } from '../../../services/portfolioAnalysisScope.js';

describe('isTickerOutsideAnalysis', () => {
  it('keeps a stock when Yahoo names it an equity', () => {
    expect(isTickerOutsideAnalysis('AAPL', 'EQUITY')).toBe(false);
  });

  it('keeps an ordinary ticker when Yahoo omits the type', () => {
    expect(isTickerOutsideAnalysis('AAPL', null)).toBe(false);
    expect(isTickerOutsideAnalysis('BRK-B', null)).toBe(false);
  });

  it('keeps stock and bond ETFs', () => {
    expect(isTickerOutsideAnalysis('GLD', 'ETF')).toBe(false);
    expect(isTickerOutsideAnalysis('TLT', 'ETF')).toBe(false);
    expect(isTickerOutsideAnalysis('BIL', 'MONEYMARKET')).toBe(false);
  });

  it('parks crypto, options, currencies, indexes, and futures by quote type', () => {
    expect(isTickerOutsideAnalysis('XAUT-USD', 'CRYPTOCURRENCY')).toBe(true);
    expect(isTickerOutsideAnalysis('AAPL240119C00100000', 'OPTION')).toBe(true);
    expect(isTickerOutsideAnalysis('EURUSD=X', 'CURRENCY')).toBe(true);
    expect(isTickerOutsideAnalysis('^GSPC', 'INDEX')).toBe(true);
    expect(isTickerOutsideAnalysis('GC=F', 'FUTURE')).toBe(true);
  });

  it('parks recognizable symbols when Yahoo does not return a type', () => {
    expect(isTickerOutsideAnalysis('XAUT-USD', null)).toBe(true);
    expect(isTickerOutsideAnalysis('GC=F', null)).toBe(true);
    expect(isTickerOutsideAnalysis('EURUSD=X', null)).toBe(true);
    expect(isTickerOutsideAnalysis('^GSPC', null)).toBe(true);
  });
});
