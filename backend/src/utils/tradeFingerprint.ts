export interface TradeFingerprintInput {
  ticker: string;
  transactionDate: string;
  transactionType: 'BUY' | 'SELL';
  shares: number;
  pricePerShare: number;
}

export function buildTradeFingerprint(trade: TradeFingerprintInput): string {
  return [
    trade.ticker.toUpperCase(),
    trade.transactionDate,
    trade.transactionType,
    trade.shares.toFixed(8),
    trade.pricePerShare.toFixed(8),
  ].join('|');
}
