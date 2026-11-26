import {
  REBALANCING_ASSET_CLASS_LABELS,
  REBALANCING_EQUITY_QUOTE_TYPE,
  REBALANCING_EQUITY_SUBCLASS_ASSET_CLASSES,
  REBALANCING_MONEY_MARKET_QUOTE_TYPE,
  type RebalancingAssetClass,
} from '../constants/rebalancing.constants.js';
import type { StockAssetClassBadge, StockAssetClassResponse } from '../types/stock.types.js';
import { classifyRebalancingAssetClassDetailed } from './rebalancingClassification.js';
import { getFundProfileSnapshots } from './fundProfileService.js';
import { getStockQuote } from './stockService.js';
import { logger } from '../utils/logger.js';

const EQUITY_SUBCLASS_SET = new Set<string>(REBALANCING_EQUITY_SUBCLASS_ASSET_CLASSES);

function profileSkipsFundCategory(quoteType: string | null): boolean {
  const normalized = quoteType?.trim().toUpperCase() ?? '';
  return (
    normalized === REBALANCING_EQUITY_QUOTE_TYPE ||
    normalized === REBALANCING_MONEY_MARKET_QUOTE_TYPE
  );
}

function buildBadges(assetClass: RebalancingAssetClass): StockAssetClassBadge[] {
  if (EQUITY_SUBCLASS_SET.has(assetClass)) {
    return [
      {
        assetClass: 'equities',
        label: REBALANCING_ASSET_CLASS_LABELS.equities,
      },
      {
        assetClass,
        label: REBALANCING_ASSET_CLASS_LABELS[assetClass],
      },
    ];
  }

  return [
    {
      assetClass,
      label: REBALANCING_ASSET_CLASS_LABELS[assetClass],
    },
  ];
}

/**
 * Descriptive asset-class badges for the ticker page.
 * Fail-closed: only `explicit` evidence produces badges; rebalancing still uses the class alone.
 */
export async function getStockAssetClass(ticker: string): Promise<StockAssetClassResponse> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const classifiedAt = new Date().toISOString();

  try {
    const quote = await getStockQuote(normalizedTicker);
    const quoteType = quote.quoteType ?? null;
    let categoryName: string | null = null;
    let stockPosition: number | null = null;

    if (!profileSkipsFundCategory(quoteType)) {
      const profiles = await getFundProfileSnapshots([normalizedTicker]);
      const profile = profiles.get(normalizedTicker);
      categoryName = profile?.categoryName ?? null;
      stockPosition = profile?.stockPosition ?? null;
    }

    const classification = classifyRebalancingAssetClassDetailed({
      quoteType,
      categoryName,
      stockPosition,
      fundName: quote.name ?? normalizedTicker,
    });

    if (classification.evidence !== 'explicit' || classification.assetClass === 'other') {
      return {
        ticker: normalizedTicker,
        badges: [],
        basis: null,
      };
    }

    return {
      ticker: normalizedTicker,
      badges: buildBadges(classification.assetClass),
      basis: {
        evidence: classification.evidence,
        quoteType: classification.quoteType,
        categoryName: classification.categoryName,
        nameSignal: classification.nameSignal,
        classifiedAt,
      },
    };
  } catch (error) {
    logger.warn({ ticker: normalizedTicker, err: error }, 'Asset-class classification failed');
    return {
      ticker: normalizedTicker,
      badges: [],
      basis: null,
    };
  }
}
