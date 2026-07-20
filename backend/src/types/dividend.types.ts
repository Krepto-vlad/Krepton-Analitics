export type DividendPaymentType = 'dividend' | 'coupon';

export interface DividendCalendarPayment {
  ticker: string;
  companyName: string;
  paymentType: DividendPaymentType;
  amountPerShare: number;
  totalAmount: number;
  currency: string;
  paymentDate: string;
  isProjected: boolean;
}

export interface DividendCalendarMonth {
  month: number;
  year: number;
  label: string;
  dividendTotal: number;
  couponTotal: number;
  total: number;
  isProjected: boolean;
}

export interface DividendCalendarSummary {
  annualIncome: number;
  avgMonthlyIncome: number;
  remainingYearIncome: number;
}

export interface DividendCalendarResponse {
  displayCurrency: string;
  chartYear: number;
  summary: DividendCalendarSummary;
  monthlyPayouts: DividendCalendarMonth[];
  upcomingPayments: DividendCalendarPayment[];
}
