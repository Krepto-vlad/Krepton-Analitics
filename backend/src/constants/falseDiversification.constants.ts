/**
 * Qualitative ETF-overlap hints for the Explain Alignment prompt.
 * Not look-through holdings data — only known index-family overlap patterns.
 */

export const ALIGNMENT_PROMPT_HOLDINGS_LIMIT = 12;
export const FALSE_DIVERSIFICATION_MIN_CLUSTER_TICKERS = 2;
export const FALSE_DIVERSIFICATION_MIN_HOLDING_WEIGHT_PERCENT = 1;
export const FALSE_DIVERSIFICATION_TOP_SECTORS_LIMIT = 5;
export const FALSE_DIVERSIFICATION_UNKNOWN_SECTOR_LABEL = 'Unknown';

export const FALSE_DIVERSIFICATION_RISK_LEVELS = ['none', 'low', 'moderate', 'high'] as const;

export interface OverlappingEquityEtfCluster {
  id: string;
  label: string;
  tickers: readonly string[];
  note: string;
}

export const OVERLAPPING_EQUITY_ETF_CLUSTERS: readonly OverlappingEquityEtfCluster[] = [
  {
    id: 'us_large_cap_growth_overlap',
    label: 'US large-cap / growth equity ETFs',
    tickers: ['VOO', 'SPY', 'IVV', 'QQQ', 'QQQM', 'VUG', 'VTI', 'IWF', 'SCHG', 'MGK', 'SPLG'],
    note: 'These funds typically share heavy exposure to the same mega-cap technology names. Holding several often looks diversified while risk stays concentrated.',
  },
  {
    id: 'us_total_market_sp500_siblings',
    label: 'US total market and S&P 500 siblings',
    tickers: ['VTI', 'ITOT', 'SCHB', 'VOO', 'SPY', 'IVV', 'SPLG'],
    note: 'Total-market and S&P 500 trackers are highly correlated; stacking them mainly duplicates US large-cap beta.',
  },
  {
    id: 'nasdaq_leveraged_twins',
    label: 'Nasdaq / leveraged Nasdaq twins',
    tickers: ['QQQ', 'QQQM', 'TQQQ', 'QLD', 'SQQQ'],
    note: 'These instruments amplify or invert the same Nasdaq-100 factor rather than adding independent diversification.',
  },
] as const;
