import type { Currency } from '../../../../constants';
import type { PortfolioTransaction } from '../../../../types/portfolio.types';
import { formatMoney, formatSignedMoney } from '../../../../utils/moneyDisplay';

export function formatUsdDecimal(value: number, currency: Currency): string {
  return formatMoney(value, currency);
}

export function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatPnl(value: number, currency: Currency): string {
  return formatSignedMoney(value, currency);
}

export function formatTransactionDate(transaction: PortfolioTransaction): string {
  const fallback = transaction.createdAt.slice(0, 10);
  const raw = transaction.transactionDate ?? fallback;

  let normalized = fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    normalized = raw;
  } else {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      normalized = parsed.toISOString().slice(0, 10);
    }
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
