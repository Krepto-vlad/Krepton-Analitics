import { inferRebalancingAssetClassFromTicker } from '../../../constants/rebalancing.constants.js';

describe('inferRebalancingAssetClassFromTicker', () => {
  it('classifies gold futures and tokenized gold as gold', () => {
    expect(inferRebalancingAssetClassFromTicker('GC=F')).toBe('gold');
    expect(inferRebalancingAssetClassFromTicker('XAUT-USD')).toBe('gold');
    expect(inferRebalancingAssetClassFromTicker('PAXG')).toBe('gold');
  });

  it('classifies silver futures and tokenized silver as commodities', () => {
    expect(inferRebalancingAssetClassFromTicker('SI=F')).toBe('commodities');
    expect(inferRebalancingAssetClassFromTicker('XAGX-USD')).toBe('commodities');
  });

  it('returns null for regular equities', () => {
    expect(inferRebalancingAssetClassFromTicker('MSFT')).toBeNull();
  });
});
