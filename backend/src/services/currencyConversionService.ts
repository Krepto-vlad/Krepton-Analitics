import type { DisplayCurrency, ConvertedMoney, ConvertibleMoney } from '../types/fx.types.js';
import { getFxRateFromLookup, preloadFxRates } from './fxRateService.js';
import { buildFxRateLookupKey, isDisplayCurrency } from '../utils/displayCurrency.js';
import { AppError } from '../middleware/errorHandler.js';

import type { TransactionRow } from '../types/portfolio.types.js';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function convertWithRate(amount: number, rate: number): number {
  return roundMoney(amount * rate);
}

export async function convertMoneyAmount(
  money: ConvertibleMoney,
  displayCurrency: DisplayCurrency,
  lookup: Map<string, number>
): Promise<ConvertedMoney> {
  if (!isDisplayCurrency(money.currency)) {
    throw new AppError(400, `Unsupported source currency: ${money.currency}`);
  }

  const fxRate = await getFxRateFromLookup(lookup, money.currency, displayCurrency, money.rateDate);

  return {
    ...money,
    displayCurrency,
    displayAmount: convertWithRate(money.amount, fxRate),
    fxRate,
  };
}

export async function createFxRateLookup(
  displayCurrency: DisplayCurrency,
  conversionRequests: Array<{ currency: string; dates: string[] }>
): Promise<Map<string, number>> {
  const lookup = new Map<string, number>();

  for (const request of conversionRequests) {
    if (!isDisplayCurrency(request.currency) || request.currency === displayCurrency) {
      continue;
    }

    await preloadFxRates(lookup, request.currency, displayCurrency, request.dates);
  }

  return lookup;
}

export function collectConversionRequests(
  entries: Array<{ currency: string; rateDate: string | null | undefined }>
): Array<{ currency: string; dates: string[] }> {
  const datesByCurrency = new Map<string, Set<string>>();

  for (const entry of entries) {
    if (!entry.rateDate || !isDisplayCurrency(entry.currency)) {
      continue;
    }

    const existingDates = datesByCurrency.get(entry.currency) ?? new Set<string>();
    existingDates.add(entry.rateDate);
    datesByCurrency.set(entry.currency, existingDates);
  }

  return [...datesByCurrency.entries()].map(([currency, dates]) => ({
    currency,
    dates: [...dates].sort(),
  }));
}

export async function convertAmountForDisplay(
  amount: number,
  sourceCurrency: string,
  rateDate: string,
  displayCurrency: DisplayCurrency,
  lookup: Map<string, number>
): Promise<{ displayAmount: number; fxRate: number }> {
  const converted = await convertMoneyAmount(
    { amount, currency: sourceCurrency, rateDate },
    displayCurrency,
    lookup
  );

  return {
    displayAmount: converted.displayAmount,
    fxRate: converted.fxRate,
  };
}

export function seedLookupWithRate(
  lookup: Map<string, number>,
  baseCurrency: DisplayCurrency,
  quoteCurrency: DisplayCurrency,
  date: string,
  rate: number
): void {
  lookup.set(buildFxRateLookupKey(baseCurrency, quoteCurrency, date), rate);
}

export function computeNativeInvestmentTotals(transactions: TransactionRow[]): {
  totalInvested: number;
  totalWithdrawn: number;
} {
  const tickersWithBuy = new Set(
    transactions
      .filter((transaction) => transaction.transaction_type === 'BUY')
      .map((transaction) => transaction.ticker)
  );

  let totalInvested = 0;
  let totalWithdrawn = 0;

  for (const transaction of transactions) {
    const transactionTotal =
      parseFloat(transaction.shares) * parseFloat(transaction.price_per_share);

    if (transaction.transaction_type === 'BUY') {
      totalInvested += transactionTotal;
      continue;
    }

    totalWithdrawn += transactionTotal;
    if (!tickersWithBuy.has(transaction.ticker)) {
      totalInvested += transactionTotal;
    }
  }

  return {
    totalInvested: roundMoney(totalInvested),
    totalWithdrawn: roundMoney(totalWithdrawn),
  };
}
