import { classifyRebalancingAssetClassDetailed } from '../../../services/rebalancingClassification.js';

describe('classifyRebalancingAssetClassDetailed evidence', () => {
  it('marks company shares as explicit equities', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'EQUITY',
        categoryName: null,
        stockPosition: null,
        fundName: 'Visa Inc.',
      })
    ).toMatchObject({ assetClass: 'equities', evidence: 'explicit', nameSignal: null });
  });

  it('marks plain S&P 500 funds as explicit with a name signal', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'ETF',
        categoryName: 'Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard S&P 500 ETF',
      })
    ).toMatchObject({
      assetClass: 'sp500',
      evidence: 'explicit',
      nameSignal: 'S&P 500 / 500 Index in fund name',
    });
  });

  it('keeps leveraged equity funds as equities but not badge-worthy', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'ETF',
        categoryName: 'Trading--Leveraged Equity',
        stockPosition: 1,
        fundName: 'ProShares UltraPro S&P 500',
      })
    ).toMatchObject({ assetClass: 'equities', evidence: 'fallback' });
  });

  it('keeps target-date funds as equities but not badge-worthy', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'MUTUALFUND',
        categoryName: 'Target-Date 2050',
        stockPosition: 0.8,
        fundName: 'Vanguard Target Retirement 2050 Fund',
      })
    ).toMatchObject({ assetClass: 'equities', evidence: 'fallback' });
  });

  it('marks missing quote type and stock-position heuristic as fallback', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: null,
        categoryName: null,
        stockPosition: null,
        fundName: 'AAPL',
      })
    ).toMatchObject({ assetClass: 'equities', evidence: 'fallback' });

    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'ETF',
        categoryName: null,
        stockPosition: 0.9,
        fundName: 'Mystery Equity ETF',
      })
    ).toMatchObject({ assetClass: 'equities', evidence: 'fallback' });
  });

  it('marks unmatched funds as fallback other', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'ETF',
        categoryName: null,
        stockPosition: null,
        fundName: 'Unknown Fund',
      })
    ).toMatchObject({ assetClass: 'other', evidence: 'fallback' });
  });

  it('marks short-term treasuries as explicit cash-like', () => {
    expect(
      classifyRebalancingAssetClassDetailed({
        quoteType: 'ETF',
        categoryName: 'Short Government',
        stockPosition: 0,
        fundName: 'iShares 1-3 Year Treasury Bond ETF',
      })
    ).toMatchObject({ assetClass: 'cash', evidence: 'explicit' });
  });
});
