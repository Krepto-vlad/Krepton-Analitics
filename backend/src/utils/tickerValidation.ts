import { TICKER_FORMAT_PATTERN, TICKER_MAX_LENGTH } from '../constants.js';

export const TICKER_FORMAT_ERROR_MESSAGE =
  'ticker must be 1-10 uppercase letters, numbers, or Yahoo symbols (. - = ^)';

export function normalizeTickerSymbol(ticker: string): string {
  return ticker.trim().toUpperCase();
}

/** Yahoo market indices use a caret prefix (`^GSPC`). Their quotes are levels, not money. */
export function isMarketIndexTicker(ticker: string): boolean {
  return normalizeTickerSymbol(ticker).startsWith('^');
}

export function isValidTickerSymbol(ticker: string): boolean {
  const normalizedTicker = normalizeTickerSymbol(ticker);
  return (
    normalizedTicker.length > 0 &&
    normalizedTicker.length <= TICKER_MAX_LENGTH &&
    TICKER_FORMAT_PATTERN.test(normalizedTicker)
  );
}

export function assertValidTickerSymbol(
  ticker: string,
  errorMessage = TICKER_FORMAT_ERROR_MESSAGE
): string {
  const normalizedTicker = normalizeTickerSymbol(ticker);

  if (!isValidTickerSymbol(normalizedTicker)) {
    throw new Error(errorMessage);
  }

  return normalizedTicker;
}
