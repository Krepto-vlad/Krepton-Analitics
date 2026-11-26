/** Route params keep percent-encoding (`%5EGSPC`), so decode before using the symbol. */
export function resolveTickerFromRouteParam(rawTicker: string): string {
  try {
    return decodeURIComponent(rawTicker).trim().toUpperCase();
  } catch {
    return '';
  }
}

/** Yahoo market indices use a caret prefix (`^GSPC`). Their quotes are levels, not money. */
export function isMarketIndexTicker(ticker: string): boolean {
  return ticker.startsWith('^');
}
