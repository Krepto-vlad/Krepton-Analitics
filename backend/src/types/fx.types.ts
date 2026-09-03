export type DisplayCurrency = 'USD' | 'EUR';

export interface FxRateResponse {
  base: DisplayCurrency;
  quote: DisplayCurrency;
  date: string;
  rate: number;
}

export interface FxRatesRangeResponse {
  base: DisplayCurrency;
  quote: DisplayCurrency;
  startDate: string;
  endDate: string;
  rates: Record<string, number>;
}

export interface FrankfurterSingleResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface FrankfurterRangeResponse {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

export type FxRateLookupKey = string;

export interface ConvertibleMoney {
  amount: number;
  currency: string;
  rateDate: string;
}

export interface ConvertedMoney extends ConvertibleMoney {
  displayCurrency: DisplayCurrency;
  displayAmount: number;
  fxRate: number;
}
