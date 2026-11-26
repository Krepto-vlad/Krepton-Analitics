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

/** Balanced / target-date funds stay equities for sleeves, but never earn a ticker badge. */
const BADGE_EXCLUDED_EQUITY_CATEGORY_PATTERN =
  /balanced|target[\s-]?date|allocation|lifecycle|world allocation/;

export type RebalancingClassificationEvidence = 'explicit' | 'fallback';

export interface RebalancingClassificationInput {
  quoteType: string | null;
  categoryName: string | null;
  stockPosition: number | null;
  fundName: string;
}

export interface RebalancingClassificationResult {
  assetClass: RebalancingAssetClass;
  evidence: RebalancingClassificationEvidence;
  quoteType: string | null;
  categoryName: string | null;
  nameSignal: string | null;
}

interface CategoryClassification {
  assetClass: RebalancingAssetClass;
  nameSignal: string | null;
}

function normalizeCategory(categoryName: string | null): string {
  return categoryName?.trim().toLowerCase() ?? '';
}

function classifyFundCategory(
  categoryName: string,
  fundName: string
): CategoryClassification | null {
  if (!categoryName) {
    return null;
  }

  if (categoryName.includes(REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER)) {
    return { assetClass: 'cash', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_LONG_GOVERNMENT) {
    if (REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN.test(fundName)) {
      return { assetClass: 'it_bonds', nameSignal: '7-10 year tenor in fund name' };
    }
    if (REBALANCING_FUND_NAME_TEN_TO_TWENTY_YEAR_PATTERN.test(fundName)) {
      return { assetClass: 'other', nameSignal: '10-20 year tenor in fund name' };
    }
    return { assetClass: 'lt_bonds', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_INTERMEDIATE_GOVERNMENT) {
    const isSevenToTen = REBALANCING_FUND_NAME_SEVEN_TO_TEN_YEAR_PATTERN.test(fundName);
    if (REBALANCING_FUND_NAME_SHORT_TREASURY_PATTERN.test(fundName) && !isSevenToTen) {
      return { assetClass: 'other', nameSignal: 'shorter treasury tenor in fund name' };
    }
    if (isSevenToTen || REBALANCING_FUND_NAME_INTERMEDIATE_TREASURY_PATTERN.test(fundName)) {
      return {
        assetClass: 'it_bonds',
        nameSignal: isSevenToTen ? '7-10 year tenor in fund name' : 'Intermediate in fund name',
      };
    }
    return { assetClass: 'other', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_SHORT_GOVERNMENT) {
    return { assetClass: 'cash', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_ULTRASHORT_BOND) {
    return isTreasuryBillName(fundName)
      ? { assetClass: 'tbill', nameSignal: 'Treasury bill wording in fund name' }
      : { assetClass: 'cash', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_COMMODITIES_BROAD_BASKET) {
    return { assetClass: 'commodities', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_COMMODITIES_FOCUSED) {
    const isPhysicalGold =
      REBALANCING_FUND_NAME_PHYSICAL_GOLD_PATTERN.test(fundName) &&
      !REBALANCING_FUND_NAME_GOLD_MINER_PATTERN.test(fundName);
    return isPhysicalGold
      ? { assetClass: 'gold', nameSignal: 'Gold (not miner) in fund name' }
      : { assetClass: 'other', nameSignal: null };
  }

  if (categoryName === REBALANCING_FUND_CATEGORY_INTERMEDIATE_CORE_BOND) {
    return { assetClass: 'core_bond', nameSignal: null };
  }

  if (REBALANCING_FUND_NON_EQUITY_CATEGORY_PATTERN.test(categoryName)) {
    return { assetClass: 'other', nameSignal: null };
  }

  return { assetClass: 'equities', nameSignal: null };
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

function isBadgeExcludedEquityCategory(categoryName: string): boolean {
  return BADGE_EXCLUDED_EQUITY_CATEGORY_PATTERN.test(categoryName);
}

/**
 * Full classification with evidence for ticker badges.
 * `explicit` means a Yahoo quote type or fund category/name rule matched;
 * `fallback` covers missing type, stock-position heuristic, leveraged products,
 * balanced/target-date equities, and catch-all paths that must not show a badge.
 */
export function classifyRebalancingAssetClassDetailed(
  input: RebalancingClassificationInput
): RebalancingClassificationResult {
  const rawQuoteType = input.quoteType?.trim() || null;
  const quoteType = rawQuoteType?.toUpperCase() ?? '';
  const rawCategoryName = input.categoryName?.trim() || null;
  const categoryName = normalizeCategory(input.categoryName);
  const fundName = input.fundName.trim().toUpperCase();

  const base = {
    quoteType: rawQuoteType,
    categoryName: rawCategoryName,
  };

  if (quoteType === REBALANCING_EQUITY_QUOTE_TYPE) {
    return {
      ...base,
      assetClass: 'equities',
      evidence: 'explicit',
      nameSignal: null,
    };
  }

  if (
    (quoteType === REBALANCING_MONEY_MARKET_QUOTE_TYPE ||
      categoryName.includes(REBALANCING_FUND_CATEGORY_MONEY_MARKET_MARKER)) &&
    isTreasuryBillName(fundName)
  ) {
    return {
      ...base,
      assetClass: 'tbill',
      evidence: 'explicit',
      nameSignal: 'Treasury bill wording in fund name',
    };
  }

  if (quoteType === REBALANCING_MONEY_MARKET_QUOTE_TYPE) {
    return {
      ...base,
      assetClass: 'cash',
      evidence: 'explicit',
      nameSignal: null,
    };
  }

  const categoryClass = classifyFundCategory(categoryName, fundName);
  if (categoryClass?.assetClass === 'equities') {
    if (isTotalInternationalStockFund(fundName, categoryName)) {
      return {
        ...base,
        assetClass: 'intl_stock',
        evidence: 'explicit',
        nameSignal: 'Total international / All-World ex-US in fund name',
      };
    }
    if (isPlainSp500IndexFund(fundName, categoryName)) {
      return {
        ...base,
        assetClass: 'sp500',
        evidence: 'explicit',
        nameSignal: 'S&P 500 / 500 Index in fund name',
      };
    }
    if (isUsTotalStockMarketFund(fundName, categoryName)) {
      return {
        ...base,
        assetClass: 'us_total',
        evidence: 'explicit',
        nameSignal: 'US total stock market wording in fund name',
      };
    }

    const isLeveraged = isLeveragedOrInverseFund(fundName, categoryName);
    const isExcludedCategory = isBadgeExcludedEquityCategory(categoryName);
    return {
      ...base,
      assetClass: 'equities',
      evidence: isLeveraged || isExcludedCategory ? 'fallback' : 'explicit',
      nameSignal: isLeveraged ? 'Leveraged or inverse product' : null,
    };
  }
  if (categoryClass) {
    return {
      ...base,
      assetClass: categoryClass.assetClass,
      evidence: categoryClass.assetClass === 'other' ? 'fallback' : 'explicit',
      nameSignal: categoryClass.nameSignal,
    };
  }

  if (
    typeof input.stockPosition === 'number' &&
    input.stockPosition >= REBALANCING_FUND_EQUITY_MIN_STOCK_POSITION
  ) {
    return {
      ...base,
      assetClass: 'equities',
      evidence: 'fallback',
      nameSignal: null,
    };
  }

  if (FUND_QUOTE_TYPES.has(quoteType)) {
    return {
      ...base,
      assetClass: 'other',
      evidence: 'fallback',
      nameSignal: null,
    };
  }

  // Missing quote type (or an unrecognized type such as an index) keeps the holding in
  // the stock sleeve for rebalancing, but must not earn a descriptive ticker badge.
  return {
    ...base,
    assetClass: 'equities',
    evidence: 'fallback',
    nameSignal: null,
  };
}

/**
 * All-Weather sleeves follow the public 30/40/15/7.5/7.5 mix:
 * stocks, 20-25 year treasuries, 7-10 year treasuries, physical gold, and a broad commodity basket.
 * A company share is always a stock, including miners and energy producers.
 */
export function classifyRebalancingAssetClass(
  input: RebalancingClassificationInput
): RebalancingAssetClass {
  return classifyRebalancingAssetClassDetailed(input).assetClass;
}
