interface TickerLogoSource {
  ticker: string;
  logoUrl: string | null;
}

/**
 * Builds an upper-case ticker → logoUrl map. Later sources do not overwrite earlier ones.
 */
export function buildLogoByTicker(
  ...sources: ReadonlyArray<ReadonlyArray<TickerLogoSource>>
): Record<string, string | null> {
  const logoByTicker: Record<string, string | null> = {};

  for (const source of sources) {
    for (const item of source) {
      const normalizedTicker = item.ticker.toUpperCase();
      if (!(normalizedTicker in logoByTicker)) {
        logoByTicker[normalizedTicker] = item.logoUrl;
      }
    }
  }

  return logoByTicker;
}
