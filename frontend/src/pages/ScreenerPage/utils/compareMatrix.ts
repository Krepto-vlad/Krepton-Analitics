import type { Currency } from '../../../constants';
import type { StockCompareItem } from '../../../types/stock.types';
import { convertAmountWithRate, formatMoney } from '../../../utils/moneyDisplay';

export interface SelectedCompareTicker {
  ticker: string;
  name: string;
}

export type CompareMetricKey =
  | 'price'
  | 'sector'
  | 'marketCap'
  | 'enterpriseValue'
  | 'trailingEps'
  | 'peRatio'
  | 'forwardPeRatio'
  | 'pegRatio'
  | 'psRatio'
  | 'priceToBook'
  | 'evToEbitda'
  | 'roe'
  | 'roa'
  | 'profitMargin'
  | 'operatingMargin'
  | 'revenueGrowth'
  | 'earningsGrowth'
  | 'debtToEquity'
  | 'currentRatio'
  | 'dividendYield'
  | 'payoutRatio'
  | 'beta';

export type CompareHighlightMode = 'lower' | 'higher';

export interface CompareMetricDefinition {
  key: CompareMetricKey;
  label: string;
  sublabel: string;
  highlightMode?: CompareHighlightMode;
}

export const COMPARE_METRICS: CompareMetricDefinition[] = [
  { key: 'price', label: 'Price', sublabel: 'Last close' },
  { key: 'sector', label: 'Sector', sublabel: 'Industry' },
  { key: 'marketCap', label: 'Market Cap', sublabel: 'Total valuation' },
  { key: 'enterpriseValue', label: 'Enterprise Value', sublabel: 'Market cap + net debt' },
  { key: 'trailingEps', label: 'EPS (TTM)', sublabel: 'Trailing earnings per share' },
  { key: 'peRatio', label: 'P/E Ratio', sublabel: 'Price-to-Earnings', highlightMode: 'lower' },
  {
    key: 'forwardPeRatio',
    label: 'Forward P/E',
    sublabel: 'Estimated next-year P/E',
    highlightMode: 'lower',
  },
  { key: 'pegRatio', label: 'PEG Ratio', sublabel: 'P/E to growth', highlightMode: 'lower' },
  { key: 'psRatio', label: 'P/S Ratio', sublabel: 'Price-to-Sales', highlightMode: 'lower' },
  { key: 'priceToBook', label: 'P/B Ratio', sublabel: 'Price-to-Book', highlightMode: 'lower' },
  {
    key: 'evToEbitda',
    label: 'EV/EBITDA',
    sublabel: 'Enterprise value / EBITDA',
    highlightMode: 'lower',
  },
  { key: 'roe', label: 'ROE', sublabel: 'Return on Equity', highlightMode: 'higher' },
  { key: 'roa', label: 'ROA', sublabel: 'Return on Assets', highlightMode: 'higher' },
  {
    key: 'profitMargin',
    label: 'Profit Margin',
    sublabel: 'Net income / revenue',
    highlightMode: 'higher',
  },
  {
    key: 'operatingMargin',
    label: 'Operating Margin',
    sublabel: 'Operating income / revenue',
    highlightMode: 'higher',
  },
  {
    key: 'revenueGrowth',
    label: 'Revenue Growth',
    sublabel: 'Year-over-year',
    highlightMode: 'higher',
  },
  {
    key: 'earningsGrowth',
    label: 'Earnings Growth',
    sublabel: 'Year-over-year',
    highlightMode: 'higher',
  },
  { key: 'debtToEquity', label: 'Debt/Equity', sublabel: 'Leverage ratio', highlightMode: 'lower' },
  { key: 'currentRatio', label: 'Current Ratio', sublabel: 'Liquidity', highlightMode: 'higher' },
  {
    key: 'dividendYield',
    label: 'Div. Yield',
    sublabel: 'Annual dividend',
    highlightMode: 'higher',
  },
  {
    key: 'payoutRatio',
    label: 'Payout Ratio',
    sublabel: 'Dividends / earnings',
    highlightMode: 'lower',
  },
  { key: 'beta', label: 'Beta', sublabel: 'Volatility vs market' },
];

const COMPARE_MONETARY_METRICS = new Set<CompareMetricKey>([
  'price',
  'marketCap',
  'enterpriseValue',
  'trailingEps',
]);

export interface CompareDisplayContext {
  displayCurrency: Currency;
  fxRates: Record<Currency, number>;
}

function convertCompareMonetaryValue(
  value: number,
  sourceCurrency: string,
  context: CompareDisplayContext
): number {
  const normalizedSourceCurrency = sourceCurrency as Currency;
  if (normalizedSourceCurrency === context.displayCurrency) {
    return value;
  }

  const fxRate = context.fxRates[normalizedSourceCurrency] ?? 1;
  return convertAmountWithRate(value, fxRate);
}

function formatCompactMoney(value: number, currency: Currency): string {
  return formatMoney(value, currency, { compact: true, maximumFractionDigits: 2 });
}

export function formatCompareMetricValue(
  metricKey: CompareMetricKey,
  item: StockCompareItem,
  context: CompareDisplayContext
): string {
  switch (metricKey) {
    case 'price':
      return item.price != null
        ? formatMoney(
            convertCompareMonetaryValue(item.price, item.currency, context),
            context.displayCurrency
          )
        : '—';
    case 'sector':
      return item.sector ?? '—';
    case 'marketCap':
      return item.marketCap != null
        ? formatCompactMoney(
            convertCompareMonetaryValue(item.marketCap, item.currency, context),
            context.displayCurrency
          )
        : '—';
    case 'enterpriseValue':
      return item.enterpriseValue != null
        ? formatCompactMoney(
            convertCompareMonetaryValue(item.enterpriseValue, item.currency, context),
            context.displayCurrency
          )
        : '—';
    case 'trailingEps':
      return item.trailingEps != null
        ? formatMoney(
            convertCompareMonetaryValue(item.trailingEps, item.currency, context),
            context.displayCurrency
          )
        : '—';
    case 'peRatio':
      return item.peRatio != null ? formatRatioValue(item.peRatio) : '—';
    case 'forwardPeRatio':
      return item.forwardPeRatio != null ? formatRatioValue(item.forwardPeRatio) : '—';
    case 'pegRatio':
      return item.pegRatio != null ? formatRatioValue(item.pegRatio) : '—';
    case 'psRatio':
      return item.psRatio != null ? formatRatioValue(item.psRatio) : '—';
    case 'priceToBook':
      return item.priceToBook != null ? formatRatioValue(item.priceToBook) : '—';
    case 'evToEbitda':
      return item.evToEbitda != null ? formatRatioValue(item.evToEbitda) : '—';
    case 'roe':
      return item.roe != null ? formatPercentValue(item.roe) : '—';
    case 'roa':
      return item.roa != null ? formatPercentValue(item.roa) : '—';
    case 'profitMargin':
      return item.profitMargin != null ? formatPercentValue(item.profitMargin) : '—';
    case 'operatingMargin':
      return item.operatingMargin != null ? formatPercentValue(item.operatingMargin) : '—';
    case 'revenueGrowth':
      return item.revenueGrowth != null ? formatPercentValue(item.revenueGrowth) : '—';
    case 'earningsGrowth':
      return item.earningsGrowth != null ? formatPercentValue(item.earningsGrowth) : '—';
    case 'debtToEquity':
      return item.debtToEquity != null ? formatRatioValue(item.debtToEquity) : '—';
    case 'currentRatio':
      return item.currentRatio != null ? formatRatioValue(item.currentRatio) : '—';
    case 'dividendYield':
      return item.dividendYield != null ? formatPercentValue(item.dividendYield) : '—';
    case 'payoutRatio':
      return item.payoutRatio != null ? formatPercentValue(item.payoutRatio) : '—';
    case 'beta':
      return item.beta != null ? formatPlainNumber(item.beta) : '—';
    default:
      return '—';
  }
}

function formatRatioValue(value: number): string {
  return `${value.toFixed(1)}x`;
}

function formatPercentValue(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatPlainNumber(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

export function getCompareMetricSecondaryValue(
  metricKey: CompareMetricKey,
  item: StockCompareItem
): string | null {
  if (metricKey === 'sector' && item.industry) {
    return item.industry;
  }
  return null;
}

export function hasCompareMetricData(
  metricKey: CompareMetricKey,
  items: StockCompareItem[]
): boolean {
  return items.some((item) => {
    if (metricKey === 'sector') {
      return Boolean(item.sector?.trim()) || Boolean(item.industry?.trim());
    }

    const value = item[metricKey];
    return typeof value === 'number' && Number.isFinite(value);
  });
}

export function getVisibleCompareMetrics(items: StockCompareItem[]): CompareMetricDefinition[] {
  return COMPARE_METRICS.filter((metric) => hasCompareMetricData(metric.key, items));
}

function getMetricNumericValue(
  item: StockCompareItem,
  metricKey: CompareMetricKey,
  context?: CompareDisplayContext
): number | null {
  const value = item[metricKey];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (context && COMPARE_MONETARY_METRICS.has(metricKey)) {
    return convertCompareMonetaryValue(value, item.currency, context);
  }

  return value;
}

export function getBestTickersForMetric(
  metricKey: CompareMetricKey,
  items: StockCompareItem[],
  context?: CompareDisplayContext
): Set<string> {
  const metricDefinition = COMPARE_METRICS.find((metric) => metric.key === metricKey);
  if (!metricDefinition?.highlightMode) {
    return new Set();
  }

  const numericEntries = items
    .map((item) => ({
      ticker: item.ticker,
      value: getMetricNumericValue(item, metricKey, context),
    }))
    .filter((entry): entry is { ticker: string; value: number } => entry.value != null);

  if (numericEntries.length < 2) {
    return new Set();
  }

  const targetValue =
    metricDefinition.highlightMode === 'lower'
      ? Math.min(...numericEntries.map((entry) => entry.value))
      : Math.max(...numericEntries.map((entry) => entry.value));

  return new Set(
    numericEntries
      .filter((entry) => Math.abs(entry.value - targetValue) < 0.0001)
      .map((entry) => entry.ticker)
  );
}
