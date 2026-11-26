import {
  DASHBOARD_HIDDEN_INDICES_STORAGE_KEY,
  DASHBOARD_MARKET_INDICES,
  DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY,
} from '../constants';

export interface MarketIndexLayoutPreference {
  /** Tickers currently shown, in the order the user arranged them. */
  visibleOrderedTickers: string[];
  /** Catalog tickers already known to this browser. New catalog entries are shown by default. */
  knownTickers: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function defaultCatalogTickers(): string[] {
  return DASHBOARD_MARKET_INDICES.map((index) => index.ticker);
}

function createDefaultPreference(): MarketIndexLayoutPreference {
  const catalogTickers = defaultCatalogTickers();
  return {
    visibleOrderedTickers: catalogTickers,
    knownTickers: catalogTickers,
  };
}

function readLegacyHiddenTickers(): string[] | null {
  try {
    const rawValue = localStorage.getItem(DASHBOARD_HIDDEN_INDICES_STORAGE_KEY);
    if (rawValue === null) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    return isStringArray(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function migrateFromLegacyHiddenTickers(hiddenTickers: string[]): MarketIndexLayoutPreference {
  const hiddenTickerSet = new Set(hiddenTickers);
  const catalogTickers = defaultCatalogTickers();
  return {
    visibleOrderedTickers: catalogTickers.filter((ticker) => !hiddenTickerSet.has(ticker)),
    knownTickers: catalogTickers,
  };
}

function parsePreference(value: unknown): MarketIndexLayoutPreference | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<MarketIndexLayoutPreference>;
  if (!isStringArray(record.visibleOrderedTickers)) {
    return null;
  }

  return {
    visibleOrderedTickers: record.visibleOrderedTickers,
    knownTickers: isStringArray(record.knownTickers)
      ? record.knownTickers
      : defaultCatalogTickers(),
  };
}

/** Interface preference only: no tokens or personal data are stored. */
export function readMarketIndexLayoutPreference(): MarketIndexLayoutPreference {
  try {
    const rawValue = localStorage.getItem(DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY);
    if (rawValue !== null) {
      const parsedPreference = parsePreference(JSON.parse(rawValue) as unknown);
      if (parsedPreference !== null) {
        return parsedPreference;
      }
    }

    const legacyHiddenTickers = readLegacyHiddenTickers();
    if (legacyHiddenTickers !== null) {
      return migrateFromLegacyHiddenTickers(legacyHiddenTickers);
    }

    return createDefaultPreference();
  } catch {
    return createDefaultPreference();
  }
}

export function saveMarketIndexLayoutPreference(preference: MarketIndexLayoutPreference): void {
  try {
    localStorage.setItem(DASHBOARD_MARKET_INDICES_LAYOUT_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Ignore quota or private-mode storage errors; the choice then lasts until reload.
  }
}
