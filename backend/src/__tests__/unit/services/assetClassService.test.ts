jest.mock('../../../services/stockService.js', () => ({
  getStockQuote: jest.fn(),
}));

jest.mock('../../../services/fundProfileService.js', () => ({
  getFundProfileSnapshots: jest.fn(),
}));

import { getStockAssetClass } from '../../../services/assetClassService.js';
import { getFundProfileSnapshots } from '../../../services/fundProfileService.js';
import { getStockQuote } from '../../../services/stockService.js';

const mockedQuote = getStockQuote as jest.MockedFunction<typeof getStockQuote>;
const mockedProfiles = getFundProfileSnapshots as jest.MockedFunction<
  typeof getFundProfileSnapshots
>;

describe('getStockAssetClass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an Equities badge for a company share without fetching a fund profile', async () => {
    mockedQuote.mockResolvedValue({
      ticker: 'V',
      name: 'Visa Inc.',
      quoteType: 'EQUITY',
    } as never);

    const result = await getStockAssetClass('v');

    expect(mockedProfiles).not.toHaveBeenCalled();
    expect(result.badges).toEqual([{ assetClass: 'equities', label: 'Equities' }]);
    expect(result.basis?.evidence).toBe('explicit');
    expect(result.basis?.quoteType).toBe('EQUITY');
  });

  it('returns parent Equities plus S&P 500 for a plain index fund', async () => {
    mockedQuote.mockResolvedValue({
      ticker: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      quoteType: 'ETF',
    } as never);
    mockedProfiles.mockResolvedValue(
      new Map([['VOO', { categoryName: 'Large Blend', stockPosition: 1 }]])
    );

    const result = await getStockAssetClass('VOO');

    expect(result.badges).toEqual([
      { assetClass: 'equities', label: 'Equities' },
      { assetClass: 'sp500', label: 'S&P 500' },
    ]);
    expect(result.basis?.nameSignal).toContain('S&P 500');
  });

  it('returns no badges for leveraged funds and for quote failures', async () => {
    mockedQuote.mockResolvedValue({
      ticker: 'UPRO',
      name: 'ProShares UltraPro S&P 500',
      quoteType: 'ETF',
    } as never);
    mockedProfiles.mockResolvedValue(
      new Map([['UPRO', { categoryName: 'Trading--Leveraged Equity', stockPosition: 1 }]])
    );

    await expect(getStockAssetClass('UPRO')).resolves.toMatchObject({
      badges: [],
      basis: null,
    });

    mockedQuote.mockRejectedValue(new Error('yahoo down'));
    await expect(getStockAssetClass('AAPL')).resolves.toMatchObject({
      badges: [],
      basis: null,
    });
  });
});
