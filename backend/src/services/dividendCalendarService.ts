import YahooFinance from 'yahoo-finance2';
import {
  DIVIDEND_CALENDAR_CACHE_TTL_MS,
  DIVIDEND_HISTORY_LOOKBACK_YEARS,
  DIVIDEND_PROJECTION_MONTHS,
  DIVIDEND_UPCOMING_PAYMENTS_LIMIT,
  MONTH_LABELS,
} from '../constants.js';
import { logger } from '../utils/logger.js';
import type { DisplayCurrency } from '../types/fx.types.js';
import type {
  DividendCalendarMonth,
  DividendCalendarPayment,
  DividendCalendarResponse,
} from '../types/dividend.types.js';
import type { PositionRow } from '../types/portfolio.types.js';
import { getCachedStockQuote } from './quoteCacheService.js';
import {
  collectConversionRequests,
  convertAmountForDisplay,
  createFxRateLookup,
  roundMoney,
} from './currencyConversionService.js';
import { getTodayIsoDate } from '../utils/displayCurrency.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

interface DividendHistoryEntry {
  date: Date;
  amountPerShare: number;
}

interface TickerDividendProfile {
  ticker: string;
  companyName: string;
  shares: number;
  sourceCurrency: string;
  historical: DividendHistoryEntry[];
  projected: DividendHistoryEntry[];
}

interface DividendCacheEntry {
  historical: DividendHistoryEntry[];
  expiresAt: number;
}

const dividendHistoryCache = new Map<string, DividendCacheEntry>();

function addMonths(date: Date, months: number): Date {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchDividendHistory(ticker: string): Promise<DividendHistoryEntry[]> {
  const upperTicker = ticker.toUpperCase();
  const cached = dividendHistoryCache.get(upperTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.historical;
  }

  const periodStart = addMonths(new Date(), -DIVIDEND_HISTORY_LOOKBACK_YEARS * 12);
  const periodEnd = addMonths(new Date(), DIVIDEND_PROJECTION_MONTHS);

  try {
    const chart = await yahooFinance.chart(upperTicker, {
      period1: periodStart,
      period2: periodEnd,
      events: 'dividends',
    });

    const historical = (chart.events?.dividends ?? [])
      .map((entry) => ({
        date: new Date(entry.date),
        amountPerShare: entry.amount,
      }))
      .filter((entry) => Number.isFinite(entry.amountPerShare) && entry.amountPerShare > 0)
      .sort((left, right) => left.date.getTime() - right.date.getTime());

    dividendHistoryCache.set(upperTicker, {
      historical,
      expiresAt: Date.now() + DIVIDEND_CALENDAR_CACHE_TTL_MS,
    });

    return historical;
  } catch (error) {
    logger.warn({ ticker: upperTicker, err: error }, 'Failed to load dividend history');
    return [];
  }
}

function estimatePaymentIntervalDays(entries: DividendHistoryEntry[]): number {
  if (entries.length < 2) {
    return 91;
  }

  const recentEntries = entries.slice(-4);
  const gaps: number[] = [];

  for (let index = 1; index < recentEntries.length; index += 1) {
    const gapDays =
      (recentEntries[index].date.getTime() - recentEntries[index - 1].date.getTime()) /
      (1000 * 60 * 60 * 24);
    gaps.push(gapDays);
  }

  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  if (averageGap <= 45) {
    return 30;
  }
  if (averageGap <= 120) {
    return 91;
  }
  if (averageGap <= 210) {
    return 182;
  }

  return 365;
}

function projectFutureDividends(
  historical: DividendHistoryEntry[],
  monthsAhead: number
): DividendHistoryEntry[] {
  if (historical.length === 0) {
    return [];
  }

  const recentEntries = historical.slice(-4);
  const averageAmount =
    recentEntries.reduce((sum, entry) => sum + entry.amountPerShare, 0) / recentEntries.length;
  const intervalDays = estimatePaymentIntervalDays(historical);
  const lastEntry = historical[historical.length - 1];

  const projected: DividendHistoryEntry[] = [];
  let nextDate = new Date(lastEntry.date);
  const horizonDate = addMonths(new Date(), monthsAhead);

  while (nextDate <= horizonDate) {
    nextDate = addDays(nextDate, intervalDays);
    if (nextDate <= new Date()) {
      continue;
    }
    if (nextDate > horizonDate) {
      break;
    }

    projected.push({
      date: nextDate,
      amountPerShare: averageAmount,
    });
  }

  return projected;
}

async function buildTickerDividendProfile(position: PositionRow): Promise<TickerDividendProfile> {
  const ticker = position.ticker.toUpperCase();
  const shares = parseFloat(position.shares);
  const historical = await fetchDividendHistory(ticker);
  const quote = await getCachedStockQuote(ticker).catch(() => null);

  return {
    ticker,
    companyName: position.company_name,
    shares,
    sourceCurrency: quote?.currency ?? position.currency,
    historical,
    projected: projectFutureDividends(historical, DIVIDEND_PROJECTION_MONTHS),
  };
}

function collectPayments(profiles: TickerDividendProfile[]): DividendCalendarPayment[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payments: DividendCalendarPayment[] = [];

  for (const profile of profiles) {
    const allEntries = [
      ...profile.historical.map((entry) => ({ ...entry, isProjected: false })),
      ...profile.projected.map((entry) => ({ ...entry, isProjected: true })),
    ];

    for (const entry of allEntries) {
      payments.push({
        ticker: profile.ticker,
        companyName: profile.companyName,
        paymentType: 'dividend',
        amountPerShare: roundMoney(entry.amountPerShare),
        totalAmount: roundMoney(entry.amountPerShare * profile.shares),
        currency: profile.sourceCurrency,
        paymentDate: toIsoDate(entry.date),
        isProjected: entry.isProjected,
      });
    }
  }

  return payments.sort(
    (left, right) => new Date(left.paymentDate).getTime() - new Date(right.paymentDate).getTime()
  );
}

function buildMonthlyPayouts(
  payments: DividendCalendarPayment[],
  chartYear: number
): DividendCalendarMonth[] {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;

  return MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const monthPayments = payments.filter((payment) => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate.getFullYear() === chartYear && paymentDate.getMonth() + 1 === month;
    });

    const dividendTotal = monthPayments
      .filter((payment) => payment.paymentType === 'dividend')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);
    const couponTotal = monthPayments
      .filter((payment) => payment.paymentType === 'coupon')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);

    const hasProjected = monthPayments.some((payment) => payment.isProjected);
    const isFutureMonth = month > currentMonth || chartYear > today.getFullYear();

    return {
      month,
      year: chartYear,
      label,
      dividendTotal: roundMoney(dividendTotal),
      couponTotal: roundMoney(couponTotal),
      total: roundMoney(dividendTotal + couponTotal),
      isProjected: hasProjected || isFutureMonth,
    };
  });
}

function buildSummary(
  monthlyPayouts: DividendCalendarMonth[],
  chartYear: number
): DividendCalendarResponse['summary'] {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const annualIncome = monthlyPayouts.reduce((sum, month) => sum + month.total, 0);
  const remainingYearIncome = monthlyPayouts
    .filter((month) => month.year === chartYear && month.month >= currentMonth)
    .reduce((sum, month) => sum + month.total, 0);

  return {
    annualIncome: roundMoney(annualIncome),
    avgMonthlyIncome: roundMoney(annualIncome / MONTH_LABELS.length),
    remainingYearIncome: roundMoney(remainingYearIncome),
  };
}

async function convertPaymentsToDisplayCurrency(
  payments: DividendCalendarPayment[],
  displayCurrency: DisplayCurrency
): Promise<DividendCalendarPayment[]> {
  const lookup = await createFxRateLookup(
    displayCurrency,
    collectConversionRequests(
      payments.map((payment) => ({
        currency: payment.currency,
        rateDate: getTodayIsoDate(),
      }))
    )
  );

  const converted = await Promise.all(
    payments.map(async (payment) => {
      if (payment.currency === displayCurrency) {
        return {
          ...payment,
          currency: displayCurrency,
        };
      }

      const convertedAmount = await convertAmountForDisplay(
        payment.totalAmount,
        payment.currency,
        getTodayIsoDate(),
        displayCurrency,
        lookup
      );
      const convertedPerShare = await convertAmountForDisplay(
        payment.amountPerShare,
        payment.currency,
        getTodayIsoDate(),
        displayCurrency,
        lookup
      );

      return {
        ...payment,
        amountPerShare: convertedPerShare.displayAmount,
        totalAmount: convertedAmount.displayAmount,
        currency: displayCurrency,
      };
    })
  );

  return converted;
}

export async function buildPortfolioDividendCalendar(
  positions: PositionRow[],
  displayCurrency: DisplayCurrency
): Promise<DividendCalendarResponse> {
  const chartYear = new Date().getFullYear();

  if (positions.length === 0) {
    return {
      displayCurrency,
      chartYear,
      summary: {
        annualIncome: 0,
        avgMonthlyIncome: 0,
        remainingYearIncome: 0,
      },
      monthlyPayouts: buildMonthlyPayouts([], chartYear),
      upcomingPayments: [],
    };
  }

  const profiles = await Promise.all(
    positions.map((position) => buildTickerDividendProfile(position))
  );
  const rawPayments = collectPayments(profiles);
  const convertedPayments = await convertPaymentsToDisplayCurrency(rawPayments, displayCurrency);

  const monthlyPayouts = buildMonthlyPayouts(convertedPayments, chartYear).map((month) => ({
    ...month,
    dividendTotal: roundMoney(month.dividendTotal),
    couponTotal: roundMoney(month.couponTotal),
    total: roundMoney(month.total),
  }));

  const todayIso = getTodayIsoDate();
  const upcomingPayments = convertedPayments
    .filter((payment) => payment.paymentDate >= todayIso)
    .slice(0, DIVIDEND_UPCOMING_PAYMENTS_LIMIT);

  return {
    displayCurrency,
    chartYear,
    summary: buildSummary(monthlyPayouts, chartYear),
    monthlyPayouts,
    upcomingPayments,
  };
}
