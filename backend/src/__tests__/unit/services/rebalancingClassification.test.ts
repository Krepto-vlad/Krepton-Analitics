import { classifyRebalancingAssetClass } from '../../../services/rebalancingClassification.js';

describe('classifyRebalancingAssetClass', () => {
  it('keeps company shares in stocks, including miners and energy producers', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'EQUITY',
        categoryName: null,
        stockPosition: null,
        fundName: 'Newmont Corporation',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'EQUITY',
        categoryName: null,
        stockPosition: null,
        fundName: 'Exxon Mobil Corporation',
      })
    ).toBe('equities');
  });

  it('splits treasury funds by the tenor in the name', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Long Government',
        stockPosition: 0,
        fundName: 'iShares 20+ Year Treasury Bond ETF',
      })
    ).toBe('lt_bonds');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Long Government',
        stockPosition: 0,
        fundName: 'iShares 7-10 Year Treasury Bond ETF',
      })
    ).toBe('it_bonds');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Intermediate Government',
        stockPosition: 0,
        fundName: 'Vanguard Intermediate-Term Treasury ETF',
      })
    ).toBe('it_bonds');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Intermediate Government',
        stockPosition: 0,
        fundName: 'iShares 3-7 Year Treasury Bond ETF',
      })
    ).toBe('other');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Long Government',
        stockPosition: 0,
        fundName: 'iShares 10-20 Year Treasury Bond ETF',
      })
    ).toBe('other');
  });

  it('leaves aggregate bonds, short treasuries, and single commodities outside the sleeves', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Intermediate Core Bond',
        stockPosition: 0,
        fundName: 'Vanguard Total Bond Market ETF',
      })
    ).toBe('core_bond');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Short Government',
        stockPosition: 0,
        fundName: 'iShares 1-3 Year Treasury Bond ETF',
      })
    ).toBe('cash');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Ultrashort Bond',
        stockPosition: 0,
        fundName: 'SPDR Bloomberg 1-3 Month T-Bill ETF',
      })
    ).toBe('tbill');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'MONEYMARKET',
        categoryName: null,
        stockPosition: null,
        fundName: 'Vanguard Treasury Money Market Fund',
      })
    ).toBe('tbill');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'MONEYMARKET',
        categoryName: null,
        stockPosition: null,
        fundName: 'Vanguard Federal Money Market Fund',
      })
    ).toBe('cash');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Ultrashort Bond',
        stockPosition: 0,
        fundName: 'JPMorgan Ultra-Short Income ETF',
      })
    ).toBe('cash');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Commodities Focused',
        stockPosition: 0,
        fundName: 'United States Oil Fund',
      })
    ).toBe('other');
  });

  it('puts physical gold and broad commodity baskets in their sleeves', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Commodities Focused',
        stockPosition: 0,
        fundName: 'SPDR Gold Shares',
      })
    ).toBe('gold');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Commodities Broad Basket',
        stockPosition: 0.02,
        fundName: 'Invesco DB Commodity Index Tracking Fund',
      })
    ).toBe('commodities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Equity Precious Metals',
        stockPosition: 0.99,
        fundName: 'VanEck Gold Miners ETF',
      })
    ).toBe('equities');
  });

  it('treats a plain S&P 500 index fund as its own class and leaves other stock funds as equities', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Large Blend',
        stockPosition: null,
        fundName: 'SPDR S&P 500 ETF Trust',
      })
    ).toBe('sp500');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'MUTUALFUND',
        categoryName: 'Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard 500 Index Fund Admiral Shares',
      })
    ).toBe('sp500');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard Total Stock Market ETF',
      })
    ).toBe('us_total');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'EQUITY',
        categoryName: null,
        stockPosition: null,
        fundName: 'Apple Inc.',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Trading--Leveraged Equity',
        stockPosition: 1,
        fundName: 'ProShares UltraPro S&P 500',
      })
    ).toBe('equities');
  });

  it('splits total-market funds into US, international, and aggregate bonds', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Foreign Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard Total International Stock ETF',
      })
    ).toBe('intl_stock');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Foreign Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard FTSE All-World ex-US ETF',
      })
    ).toBe('intl_stock');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Diversified Emerging Mkts',
        stockPosition: 1,
        fundName: 'Vanguard FTSE Emerging Markets ETF',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Foreign Large Blend',
        stockPosition: 1,
        fundName: 'Vanguard Total World Stock ETF',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Foreign Large Blend',
        stockPosition: 1,
        fundName: 'Schwab International Equity ETF',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Intermediate Core-Plus Bond',
        stockPosition: 0,
        fundName: 'Core Plus Bond Fund',
      })
    ).toBe('other');
  });

  it('treats a stock fund category as equities and an unknown fund as outside the sleeves', () => {
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: 'Large Growth',
        stockPosition: null,
        fundName: 'Invesco QQQ Trust',
      })
    ).toBe('equities');
    expect(
      classifyRebalancingAssetClass({
        quoteType: 'ETF',
        categoryName: null,
        stockPosition: null,
        fundName: 'Unknown Fund',
      })
    ).toBe('other');
    expect(
      classifyRebalancingAssetClass({
        quoteType: null,
        categoryName: null,
        stockPosition: null,
        fundName: 'AAPL',
      })
    ).toBe('equities');
  });
});
