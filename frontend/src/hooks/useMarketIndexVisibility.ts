import { useCallback, useMemo, useState } from 'react';
import { DASHBOARD_MARKET_INDICES } from '../constants';
import {
  readMarketIndexLayoutPreference,
  saveMarketIndexLayoutPreference,
  type MarketIndexLayoutPreference,
} from '../utils/marketIndexVisibilityStorage';

export type MarketIndexDefinition = (typeof DASHBOARD_MARKET_INDICES)[number];

export interface UseMarketIndexVisibilityResult {
  visibleIndices: MarketIndexDefinition[];
  isIndexVisible: (ticker: string) => boolean;
  setIndexVisible: (ticker: string, isVisible: boolean) => void;
  moveVisibleIndex: (fromIndex: number, toIndex: number) => void;
}

const CATALOG_BY_TICKER: Map<string, MarketIndexDefinition> = new Map(
  DASHBOARD_MARKET_INDICES.map((index) => [index.ticker, index])
);

function catalogTickers(): string[] {
  return DASHBOARD_MARKET_INDICES.map((index) => index.ticker);
}

function resolveVisibleOrderedTickers(preference: MarketIndexLayoutPreference): string[] {
  const knownTickerSet = new Set(preference.knownTickers);
  const seenTickers = new Set<string>();
  const orderedTickers: string[] = [];

  for (const ticker of preference.visibleOrderedTickers) {
    if (!CATALOG_BY_TICKER.has(ticker) || seenTickers.has(ticker)) {
      continue;
    }
    seenTickers.add(ticker);
    orderedTickers.push(ticker);
  }

  for (const index of DASHBOARD_MARKET_INDICES) {
    if (seenTickers.has(index.ticker) || knownTickerSet.has(index.ticker)) {
      continue;
    }
    // Brand-new catalog entries appear for everyone by default.
    orderedTickers.push(index.ticker);
    seenTickers.add(index.ticker);
  }

  return orderedTickers;
}

function buildPreference(visibleOrderedTickers: string[]): MarketIndexLayoutPreference {
  return {
    visibleOrderedTickers,
    knownTickers: catalogTickers(),
  };
}

export function useMarketIndexVisibility(): UseMarketIndexVisibilityResult {
  const [preference, setPreference] = useState<MarketIndexLayoutPreference>(
    readMarketIndexLayoutPreference
  );

  const visibleOrderedTickers = useMemo(
    () => resolveVisibleOrderedTickers(preference),
    [preference]
  );

  const visibleIndices = useMemo(
    () =>
      visibleOrderedTickers
        .map((ticker) => CATALOG_BY_TICKER.get(ticker))
        .filter((index): index is MarketIndexDefinition => index !== undefined),
    [visibleOrderedTickers]
  );

  const visibleTickerSet = useMemo(() => new Set(visibleOrderedTickers), [visibleOrderedTickers]);

  const persist = useCallback((nextVisibleOrderedTickers: string[]) => {
    const nextPreference = buildPreference(nextVisibleOrderedTickers);
    saveMarketIndexLayoutPreference(nextPreference);
    setPreference(nextPreference);
  }, []);

  const isIndexVisible = useCallback(
    (ticker: string) => visibleTickerSet.has(ticker),
    [visibleTickerSet]
  );

  const setIndexVisible = useCallback(
    (ticker: string, isVisible: boolean) => {
      if (!CATALOG_BY_TICKER.has(ticker)) {
        return;
      }

      const withoutTicker = visibleOrderedTickers.filter(
        (visibleTicker) => visibleTicker !== ticker
      );
      persist(isVisible ? [...withoutTicker, ticker] : withoutTicker);
    },
    [persist, visibleOrderedTickers]
  );

  const moveVisibleIndex = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= visibleOrderedTickers.length ||
        toIndex >= visibleOrderedTickers.length
      ) {
        return;
      }

      const nextVisibleOrderedTickers = [...visibleOrderedTickers];
      const [movedTicker] = nextVisibleOrderedTickers.splice(fromIndex, 1);
      nextVisibleOrderedTickers.splice(toIndex, 0, movedTicker);
      persist(nextVisibleOrderedTickers);
    },
    [persist, visibleOrderedTickers]
  );

  return { visibleIndices, isIndexVisible, setIndexVisible, moveVisibleIndex };
}
