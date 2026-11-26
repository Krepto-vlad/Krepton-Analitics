import {
  DASHBOARD_HIDDEN_INDICES_STORAGE_KEY,
  DASHBOARD_MARKET_INDICES,
  DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
} from '../../constants';
import {
  readMarketIndexLayoutPreference,
  saveMarketIndexLayoutPreference,
} from '../marketIndexVisibilityStorage';

describe('marketIndexVisibilityStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the full catalog order', () => {
    expect(readMarketIndexLayoutPreference()).toEqual({
      visibleOrderedTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
      knownTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
    });
  });

  it('round-trips the layout preference', () => {
    saveMarketIndexLayoutPreference({
      visibleOrderedTickers: ['^DJI', '^GSPC'],
      knownTickers: DASHBOARD_MARKET_INDICES.map((index) => index.ticker),
    });

    expect(readMarketIndexLayoutPreference().visibleOrderedTickers).toEqual(['^DJI', '^GSPC']);
  });

  it('migrates the legacy hidden-tickers key', () => {
    localStorage.setItem(DASHBOARD_HIDDEN_INDICES_STORAGE_KEY, JSON.stringify(['^DJI']));

    expect(readMarketIndexLayoutPreference().visibleOrderedTickers).toEqual(
      DASHBOARD_MARKET_INDICES.map((index) => index.ticker).filter((ticker) => ticker !== '^DJI')
    );
  });

  it('ignores corrupt values', () => {
    localStorage.setItem(DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY, '{not json');
    expect(readMarketIndexLayoutPreference().visibleOrderedTickers).toEqual(
      DASHBOARD_MARKET_INDICES.map((index) => index.ticker)
    );
  });
});
