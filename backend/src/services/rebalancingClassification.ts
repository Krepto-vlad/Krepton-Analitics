import {
  REBALANCING_EQUITY_QUOTE_TYPE,
  REBALANCING_FUND_CATEGORY_COMMODITIES_BROAD_BASKET,
  REBALANCING_FUND_CATEGORY_COMMODITIES_FOCUSED,
  REBALANCING_FUND_CATEGORY_INTERMEDIATE_CORE_BOND,
  REBALANCING_FUND_CATEGORY_INTERMEDIATE_GOVERNMENT,
  REBALANCING_FUND_CATEGORY_LONG_GOVERNMENT,
  REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER,
  REBALANCING_FUND_CATEGORY_SHORT_GOVERNMENT,
  REBALANCING_FUND_CATEGORY_ULTRASHORT_BOND,
  REBALANCING_FUND_EQUITY_MIN_STOCK_POSITION,
  REBALANCING_FUND_LEVERAGED_CATEGORY_PATTERN,
  REBALANCING_FUND_NAME_GOLD_MINER_PATTERN,
  REBALANCING_FUND_NAME_INTERMEDIATE_TREASURY_PATTERN,
  REBALANCING_FUND_NAME_LEVERAGED_OR_INVERSE_PATTERN,
  REBALANCING_FUND_NAME_EMERGING_MARKET_PATTERN,
  REBALANCING_FUND_NAME_NOT_US_TOTAL_PATTERN,
  REBALANCING_FUND_NAME_PHYSICAL_GOLD_PATTERN,
  REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN,
  REBALANCING_FUND_NAME_SHORT_TREASURY_PATTERN,
  REBALANCING_FUND_NAME_SMALL_CAP_PATTERN,
  REBALANCING_FUND_NAME_SP500_PATTERN,
  REBALANCING_FUND_NAME_TEN_TO_TWENTY_YEAR_PATTERN,
  REBALANCING_FUND_NAME_TREASURY_BILL_PATTERN,
  REBALANCING_FUND_NAME_TOTAL_INTERNATIONAL_PATTERN,
  REBALANCING_FUND_NAME_US_TOTAL_MARKET_PATTERN,
  REBALANCING_FUND_NON_EQUITY_CATEGORY_PATTERN,
  REBALANCING_FUND_QUOTE_TYPES,
  REBALANCING_MONEY_MARKET_QUOTE_TYPE,
  type RebalancingAssetClass,
} from '../constants/rebalancing.constants.js';

const FUND_QUOTE_TYPES = new Set<string>(REBALANCING_FUND_QUOTE_TYPES);

export interface RebalancingClassificationInput {
  quoteType: string | null;
  categoryName: string | null;
  stockPosition: number | null;
  fundName: string;
}

function normalizeCategory(categoryName: string | null): string {
  return categoryName?.trim().toLowerCase() ?? '';
}

function classifyFundCategory(
  categoryName: string,
  fundName: string
): RebalancingAssetClass | null {
  if (!categoryName) {
    return null;
  }

  if (categoryName.includes(REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER)) {
    return 'cash';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_LONG_GOVERNMENT) {
    if (REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN.test(fundName)) {
      return 'it_bonds';
    }
    if (REBALANCING_FUND_NAME_TEN_TO_TWENTY_YEAR_PATTERN.test(fundName)) {
      return 'other';
    }
    return 'lt_bonds';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_INTERMEDIATE_GOVERNMENT) {
    const isSevenToTen = REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN.test(fundName);
    if (REBALANCING_FUND_NAME_SHORT_TREASURY_PATTERN.test(fundName) && !isSevenToTen) {
      return 'other';
    }
    if (isSevenToTen || REBALANCING_FUND_NAME_INTERMEDIATE_TREASURY_PATTERN.test(fundName)) {
      return 'it_bonds';
    }
    return 'other';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_SHORT_GOVERNMENT) {
    return 'cash';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_ULTRASHORT_BOND) {
    return isTreasuryBillName(fundName) ? 'tbill' : 'cash';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_COMMODITIES_BROAD_BASKET) {
    return 'commodities';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_COMMODITIES_FOCUSED) {
    const isPhysicalGold =
      REBALANCING_FUND_NAME_PHYSICAL_GOLD_PATTERN.test(fundName) &&
      !REBALANCING_FUND_NAME_GOLD_MINER_PATTERN.test(fundName);
    return isPhysicalGold ? 'gold' : 'other';
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_INTERMEDIATE_CORE_BOND) {
    return 'core_bond';
  }

  if (REBALANCING_FUND_NON_EQUITY_CATEGORY_PATTERN.test(categoryName)) {
    return 'other';
  }

  return 'equities';
}

function isTreasuryBillName(fundName: string): boolean {
  return REBALANCING_FUND_NAME_TREASURY_BILL_PATTERN.test(fundName);
}

function isLeveragedOrInverseFund(fundName: string, categoryName: string): boolean {
  return (
    REBALANCING_FUND_NAME_LEVERAGED_OR_INVERSE_PATTERN.test(fundName) ||
    REBALANCING_FUND_LEVERAGED_CATEGORY_PATTERN.test(categoryName)
  );
}

function isPlainSp500IndexFund(fundName: string, categoryName: string): boolean {
  return (
    REBALANCING_FUND_NAME_SP500_PATTERN.test(fundName) &&
    !isLeveragedOrInverseFund(fundName, categoryName)
  );
}

function isTotalInternationalStockFund(fundName: string, categoryName: string): boolean {
  if (isLeveragedOrInverseFund(fundName, categoryName)) {
    return false;
  }
  if (
    REBALANCING_FUND_NAME_EMERGING_MARKET_PATTERN.test(fundName) ||
    REBALANCING_FUND_NAME_SMALL_CAP_PATTERN.test(fundName)
  ) {
    return false;
  }
  return REBALANCING_FUND_NAME_TOTAL_INTERNATIONAL_PATTERN.test(fundName);
}

function isUsTotalStockMarketFund(fundName: string, categoryName: string): boolean {
  if (isLeveragedOrInverseFund(fundName, categoryName)) {
    return false;
  }
  if (REBALANCING_FUND_NAME_NOT_US_TOTAL_PATTERN.test(fundName)) {
    return false;
  }
  return REBALANCING_FUND_NAME_US_TOTAL_MARKET_PATTERN.test(fundName);
}

/**
 * All-Weather sleeves follow the public 30/40/15/7.5/7.5 mix:
 * stocks, 20-25 year treasuries, 7-10 year treasuries, physical gold, and a broad commodity basket.
 * A company share is always a stock, including miners and energy producers.
 */
export function classifyRebalancingAssetClass(
  input: RebalancingClassificationInput
): RebalancingAssetClass {
  const quoteType = input.quoteType?.trim().toUpperCase() ?? '';
  const categoryName = normalizeCategory(input.categoryName);
  const fundName = input.fundName.trim().toUpperCase();

  if (quoteType === REBALANCING_EQUITY_QUOTE_TYPE) {
    return 'equities';
  }

  if (
    (quoteType === REBALANCING_MONEY_MARKET_QUOTE_TYPE ||
      categoryName.includes(REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER)) &&
    isTreasuryBillName(fundName)
  ) {
    return 'tbill';
  }

  if (quoteType === REBALANCING_MONEY_MARKET_QUOTE_TYPE) {
    return 'cash';
  }

  const categoryClass = classifyFundCategory(categoryName, fundName);
  if (categoryClass === 'equities' && isTotalInternationalStockFund(fundName, categoryName)) {
    return 'intl_stock';
  }
  if (categoryClass === 'equities' && isPlainSp500IndexFund(fundName, categoryName)) {
    return 'sp500';
  }
  if (categoryClass === 'equities' && isUsTotalStockMarketFund(fundName, categoryName)) {
    return 'us_total';
  }
  if (categoryClass) {
    return categoryClass;
  }

  if (
    typeof input.stockPosition === 'number' &&
    input.stockPosition >= REBALANCING_FUND_EQUITY_MIN_STOCK_POSITION
  ) {
    return 'equities';
  }

  if (FUND_QUOTE_TYPES.has(quoteType)) {
    return 'other';
  }

  return 'equities';
}
