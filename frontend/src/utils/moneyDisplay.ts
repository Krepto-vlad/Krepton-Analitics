import type { Currency } from '../constants';
import type { EquityDataPoint, InvestmentSummary } from '../types/portfolio.types';

export function formatMoney(
  value: number,
  currency: Currency,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; compact?: boolean }
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2, compact = false } = options ?? {};

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatMoneyWhole(value: number, currency: Currency): string {
  return formatMoney(value, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatSignedMoney(value: number, currency: Currency, compact = false): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatMoney(value, currency, { compact, minimumFractionDigits: compact ? 1 : 0, maximumFractionDigits: compact ? 1 : 0 })}`;
}

export function resolveEquityHistoryForDisplay(
  history: EquityDataPoint[],
  displayCurrency: Currency
): EquityDataPoint[] {
  return history.map((point) => ({
    time: point.time,
    value: point.displayValue ?? point.value,
    displayValue: point.displayValue,
    displayCurrency: point.displayCurrency ?? displayCurrency,
  }));
}

export function resolveInvestmentSummaryForDisplay(
  summary: InvestmentSummary,
  displayCurrency: Currency
): { totalInvested: number; totalWithdrawn: number } {
  if (summary.displayCurrency === displayCurrency) {
    return {
      totalInvested: summary.displayTotalInvested ?? summary.totalInvested,
      totalWithdrawn: summary.displayTotalWithdrawn ?? summary.totalWithdrawn,
    };
  }

  return {
    totalInvested: summary.totalInvested,
    totalWithdrawn: summary.totalWithdrawn,
  };
}

export function convertAmountWithRate(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Converts a monetary amount from source currency to display currency using FX rates.
 * Falls back to rate 1 when the pair is missing (caller should avoid mislabeling).
 */
export function convertAmountToDisplayCurrency(
  amount: number,
  fromCurrency: Currency,
  displayCurrency: Currency,
  fxRates: Record<Currency, number>
): number {
  if (fromCurrency === displayCurrency) {
    return amount;
  }

  return convertAmountWithRate(amount, fxRates[fromCurrency] ?? 1);
}

export function getTodayIsoDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrencySymbol(currency: Currency): string {
  const currencyPart = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency');

  return currencyPart?.value ?? currency;
}
