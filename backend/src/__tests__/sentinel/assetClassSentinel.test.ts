/**
 * Live Yahoo check for known funds/shares. Runs only via `npm run test:sentinel`
 * (nightly workflow). Not part of CI unit coverage.
 */
import { getStockAssetClass } from '../../services/assetClassService.js';

const EXPECTED_BADGE_ASSET_CLASSES: ReadonlyArray<{
  ticker: string;
  assetClasses: readonly string[];
}> = [
  { ticker: 'AAPL', assetClasses: ['equities'] },
  { ticker: 'VOO', assetClasses: ['equities', 'sp500'] },
  { ticker: 'VTI', assetClasses: ['equities', 'us_total'] },
  { ticker: 'VXUS', assetClasses: ['equities', 'intl_stock'] },
  { ticker: 'TLT', assetClasses: ['lt_bonds'] },
  { ticker: 'IEF', assetClasses: ['it_bonds'] },
  { ticker: 'BND', assetClasses: ['core_bond'] },
  { ticker: 'GLD', assetClasses: ['gold'] },
  { ticker: 'DBC', assetClasses: ['commodities'] },
  { ticker: 'SHY', assetClasses: ['cash'] },
  { ticker: 'BIL', assetClasses: ['tbill'] },
  { ticker: 'UPRO', assetClasses: [] },
];

describe('asset-class Yahoo sentinel', () => {
  it.each(EXPECTED_BADGE_ASSET_CLASSES)(
    'classifies $ticker as $assetClasses',
    async ({ ticker, assetClasses }) => {
      const result = await getStockAssetClass(ticker);
      expect(result.badges.map((badge) => badge.assetClass)).toEqual([...assetClasses]);
    }
  );
});
