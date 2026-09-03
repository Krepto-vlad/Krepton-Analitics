import type { Currency } from '../../../constants';
import type { StockBacktestResponse } from '../../../types/stock.types';
import { convertAmountWithRate, formatMoneyWhole } from '../../../utils/moneyDisplay';

export function formatBacktestPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatBacktestMoney(value: number, currency: Currency): string {
  return formatMoneyWhole(value, currency);
}

export function convertBacktestResponseForDisplay(
  data: StockBacktestResponse,
  fxRate: number,
  displayCurrency: Currency
): StockBacktestResponse {
  const convertValue = (value: number) => convertAmountWithRate(value, fxRate);

  return {
    ...data,
    amount: convertValue(data.amount),
    displayCurrency,
    portfolio: {
      ...data.portfolio,
      finalValue: convertValue(data.portfolio.finalValue),
      currency: displayCurrency,
    },
    holdings: data.holdings.map((holding) => ({
      ...holding,
      allocatedAmount: convertValue(holding.allocatedAmount),
      contributionValue: convertValue(holding.contributionValue),
      currency: displayCurrency,
    })),
    benchmark: {
      ...data.benchmark,
      finalValue: convertValue(data.benchmark.finalValue),
      currency: displayCurrency,
    },
  };
}

export const BACKTEST_BENCHMARK_COLOR = 'var(--color-benchmark)';
export const BACKTEST_PORTFOLIO_COLOR = '#10b981';
