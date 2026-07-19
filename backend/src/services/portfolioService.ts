import { AppError } from '../middleware/errorHandler.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { getStockSector, getStockHistory } from './stockService.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
  getPositionsByPortfolioIdPaginated,
  countPositionsByPortfolioId,
  getTransactionsByPortfolioIdPaginated,
  countTransactionsByPortfolioId,
  upsertPosition,
  addTransaction,
  getPositionById,
  getPositionByTicker,
  reducePositionShares,
  updatePosition,
  deletePosition,
  deletePositionRowOnly,
  getTransactionById,
  getTransactionsByTicker,
  getBuyTransactionsByTicker,
  deleteTransactionById,
  updatePositionSector,
  getAllTransactionsForDedup,
  insertPositionFromLedger,
} from '../repositories/portfolioRepository.js';
import type {
  AddPositionDto,
  UpdatePositionDto,
  ClosePositionDto,
  PositionResponse,
  PositionRow,
  TransactionRow,
  TransactionResponse,
  PaginatedResponse,
  InvestmentSummaryResponse,
  EquityPoint,
} from '../types/portfolio.types.js';
import type { DisplayCurrency } from '../types/fx.types.js';
import {
  convertAmountForDisplay,
  convertWithRate,
  createFxRateLookup,
  collectConversionRequests,
  roundMoney,
  computeNativeInvestmentTotals,
} from './currencyConversionService.js';
import { getFxRateFromLookup, preloadFxRates } from './fxRateService.js';
import { getTodayIsoDate, parseDisplayCurrency } from '../utils/displayCurrency.js';
import {
  COMPANY_NAME_MAX_LENGTH,
  MAX_SHARES,
  MAX_PRICE,
  ALLOWED_CURRENCIES,
  HOLDINGS_PAGE_SIZE,
  TRANSACTIONS_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants.js';
import type { SupportedBrokerId } from '../constants.js';
import type { NormalizedTrade, ImportConfirmResponse } from '../types/import.types.js';
import { buildTradeFingerprint } from '../utils/tradeFingerprint.js';

// ─── HMAC indirection ─────────────────────────────────────────────────────────

// Owner token derivation lives in utils/portfolioOwnerToken.ts (shared with watchlist).

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRowToResponse(row: PositionRow): PositionResponse {
  return {
    id: row.id,
    ticker: row.ticker,
    companyName: row.company_name,
    shares: parseFloat(row.shares),
    avgBuyPrice: parseFloat(row.avg_buy_price),
    currency: row.currency,
    sector: row.sector ?? null,
    entryDate: row.entry_date,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function normalizeDbDate(value: string | Date | null): string | null {
  if (!value) return null;
  const parsed = new Date(value as string | Date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function mapTransactionRowToResponse(row: TransactionRow): TransactionResponse {
  return {
    id: row.id,
    ticker: row.ticker,
    companyName: row.company_name,
    shares: parseFloat(row.shares),
    pricePerShare: parseFloat(row.price_per_share),
    currency: row.currency,
    transactionDate: normalizeDbDate(row.transaction_date),
    transactionType: row.transaction_type,
    createdAt: row.created_at.toISOString(),
  };
}

function parsePaginationParams(
  rawLimit: unknown,
  rawOffset: unknown,
  defaultLimit: number
): { limit: number; offset: number } {
  const parsedLimit = rawLimit === undefined ? defaultLimit : Number(rawLimit);
  const parsedOffset = rawOffset === undefined ? 0 : Number(rawOffset);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_PAGE_SIZE) {
    throw new AppError(400, `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    throw new AppError(400, 'offset must be a non-negative integer');
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

async function enrichPositionsWithSectors(
  portfolioId: string,
  rows: PositionRow[]
): Promise<PositionRow[]> {
  const nullSectorRows = rows.filter((row) => !row.sector);
  if (nullSectorRows.length === 0) return rows;

  const uniqueNullTickers = [...new Set(nullSectorRows.map((row) => row.ticker))];
  const sectorResults = await Promise.allSettled(
    uniqueNullTickers.map((ticker) => getStockSector(ticker))
  );

  const sectorMap: Record<string, string> = {};
  sectorResults.forEach((result, index) => {
    sectorMap[uniqueNullTickers[index]] =
      result.status === 'fulfilled' ? result.value.sector : 'Other';
  });

  void Promise.allSettled(
    nullSectorRows.map((row) =>
      updatePositionSector(row.id, portfolioId, sectorMap[row.ticker] ?? 'Other')
    )
  );

  return rows.map((row) => ({
    ...row,
    sector: row.sector ?? sectorMap[row.ticker] ?? null,
  }));
}

function validateAddPositionDto(dto: AddPositionDto): void {
  if (!dto.ticker || typeof dto.ticker !== 'string') {
    throw new AppError(400, 'ticker is required');
  }
  if (!/^[A-Z0-9.]{1,10}$/.test(dto.ticker.toUpperCase())) {
    throw new AppError(400, 'ticker must be 1-10 uppercase letters/numbers');
  }
  if (!dto.companyName || typeof dto.companyName !== 'string') {
    throw new AppError(400, 'companyName is required');
  }
  if (dto.companyName.length > COMPANY_NAME_MAX_LENGTH) {
    throw new AppError(400, `companyName must be at most ${COMPANY_NAME_MAX_LENGTH} characters`);
  }
  if (typeof dto.shares !== 'number' || dto.shares <= 0 || dto.shares > MAX_SHARES) {
    throw new AppError(400, `shares must be a positive number up to ${MAX_SHARES}`);
  }
  if (typeof dto.avgBuyPrice !== 'number' || dto.avgBuyPrice <= 0 || dto.avgBuyPrice > MAX_PRICE) {
    throw new AppError(400, `avgBuyPrice must be a positive number up to ${MAX_PRICE}`);
  }
  if (!ALLOWED_CURRENCIES.includes(dto.currency)) {
    throw new AppError(400, `currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
  }
  if (dto.entryDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dto.entryDate)) {
    throw new AppError(400, 'entryDate must be in YYYY-MM-DD format');
  }
}

function validateUpdatePositionDto(dto: UpdatePositionDto): void {
  if (Object.keys(dto).length === 0) {
    throw new AppError(400, 'At least one field must be provided for update');
  }
  if (dto.shares !== undefined) {
    if (typeof dto.shares !== 'number' || dto.shares <= 0 || dto.shares > MAX_SHARES) {
      throw new AppError(400, `shares must be a positive number up to ${MAX_SHARES}`);
    }
  }
  if (dto.avgBuyPrice !== undefined) {
    if (
      typeof dto.avgBuyPrice !== 'number' ||
      dto.avgBuyPrice <= 0 ||
      dto.avgBuyPrice > MAX_PRICE
    ) {
      throw new AppError(400, `avgBuyPrice must be a positive number up to ${MAX_PRICE}`);
    }
  }
  if (dto.currency !== undefined && !ALLOWED_CURRENCIES.includes(dto.currency)) {
    throw new AppError(400, `currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
  }
  if (dto.entryDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dto.entryDate)) {
    throw new AppError(400, 'entryDate must be in YYYY-MM-DD format');
  }
}

function resolveTransactionRateDate(row: TransactionRow): string {
  return normalizeDbDate(row.transaction_date) ?? row.created_at.toISOString().slice(0, 10);
}

function resolvePositionRateDate(row: PositionRow): string {
  return normalizeDbDate(row.entry_date) ?? row.created_at.toISOString().slice(0, 10);
}

async function applyDisplayFieldsToPosition(
  position: PositionResponse,
  sourceRow: PositionRow,
  displayCurrency: DisplayCurrency,
  lookup: Map<string, number>
): Promise<PositionResponse> {
  if (position.currency === displayCurrency) {
    return {
      ...position,
      displayCurrency,
      displayAvgBuyPrice: position.avgBuyPrice,
      displayFxRate: 1,
      displayFxRateDate: resolvePositionRateDate(sourceRow),
    };
  }

  const rateDate = resolvePositionRateDate(sourceRow);
  const converted = await convertAmountForDisplay(
    position.avgBuyPrice,
    position.currency,
    rateDate,
    displayCurrency,
    lookup
  );

  return {
    ...position,
    displayCurrency,
    displayAvgBuyPrice: converted.displayAmount,
    displayFxRate: converted.fxRate,
    displayFxRateDate: rateDate,
  };
}

async function applyDisplayFieldsToTransaction(
  transaction: TransactionResponse,
  sourceRow: TransactionRow,
  displayCurrency: DisplayCurrency,
  lookup: Map<string, number>
): Promise<TransactionResponse> {
  const nativeTotal = roundMoney(transaction.shares * transaction.pricePerShare);
  const rateDate = resolveTransactionRateDate(sourceRow);

  if (transaction.currency === displayCurrency) {
    return {
      ...transaction,
      displayCurrency,
      displayPricePerShare: transaction.pricePerShare,
      displayTotalAmount: nativeTotal,
      displayFxRate: 1,
      displayFxRateDate: rateDate,
    };
  }

  const convertedPrice = await convertAmountForDisplay(
    transaction.pricePerShare,
    transaction.currency,
    rateDate,
    displayCurrency,
    lookup
  );

  return {
    ...transaction,
    displayCurrency,
    displayPricePerShare: convertedPrice.displayAmount,
    displayTotalAmount: convertWithRate(nativeTotal, convertedPrice.fxRate),
    displayFxRate: convertedPrice.fxRate,
    displayFxRateDate: rateDate,
  };
}

async function buildDisplayLookupForTransactions(
  rows: TransactionRow[],
  displayCurrency: DisplayCurrency
): Promise<Map<string, number>> {
  return createFxRateLookup(
    displayCurrency,
    collectConversionRequests(
      rows.map((row) => ({
        currency: row.currency,
        rateDate: resolveTransactionRateDate(row),
      }))
    )
  );
}

async function buildDisplayLookupForPositions(
  rows: PositionRow[],
  displayCurrency: DisplayCurrency
): Promise<Map<string, number>> {
  return createFxRateLookup(
    displayCurrency,
    collectConversionRequests(
      rows.map((row) => ({
        currency: row.currency,
        rateDate: resolvePositionRateDate(row),
      }))
    )
  );
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getUserPositions(
  userId: string,
  rawDisplayCurrency?: unknown
): Promise<PositionResponse[]> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);
  const enrichedRows = await enrichPositionsWithSectors(portfolioId, rows);
  const items = enrichedRows.map(mapRowToResponse);
  const lookup = await buildDisplayLookupForPositions(enrichedRows, displayCurrency);

  return Promise.all(
    items.map((item, index) =>
      applyDisplayFieldsToPosition(item, enrichedRows[index], displayCurrency, lookup)
    )
  );
}

export async function getUserPositionsPaginated(
  userId: string,
  rawLimit: unknown,
  rawOffset: unknown,
  rawDisplayCurrency?: unknown
): Promise<PaginatedResponse<PositionResponse>> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const { limit, offset } = parsePaginationParams(rawLimit, rawOffset, HOLDINGS_PAGE_SIZE);
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const [rows, total] = await Promise.all([
    getPositionsByPortfolioIdPaginated(portfolioId, limit, offset),
    countPositionsByPortfolioId(portfolioId),
  ]);

  const enrichedRows = await enrichPositionsWithSectors(portfolioId, rows);
  const mappedItems = enrichedRows.map(mapRowToResponse);
  const lookup = await buildDisplayLookupForPositions(enrichedRows, displayCurrency);
  const items = await Promise.all(
    mappedItems.map((item, index) =>
      applyDisplayFieldsToPosition(item, enrichedRows[index], displayCurrency, lookup)
    )
  );

  return buildPaginatedResponse(items, total, limit, offset);
}

export async function getUserTransactionsPaginated(
  userId: string,
  rawLimit: unknown,
  rawOffset: unknown,
  rawDisplayCurrency?: unknown
): Promise<PaginatedResponse<TransactionResponse>> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const { limit, offset } = parsePaginationParams(rawLimit, rawOffset, TRANSACTIONS_PAGE_SIZE);
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const [rows, total] = await Promise.all([
    getTransactionsByPortfolioIdPaginated(portfolioId, limit, offset),
    countTransactionsByPortfolioId(portfolioId),
  ]);

  const mappedItems = rows.map(mapTransactionRowToResponse);
  const lookup = await buildDisplayLookupForTransactions(rows, displayCurrency);
  const items = await Promise.all(
    mappedItems.map((item, index) =>
      applyDisplayFieldsToTransaction(item, rows[index], displayCurrency, lookup)
    )
  );

  return buildPaginatedResponse(items, total, limit, offset);
}

export async function getInvestmentSummary(
  userId: string,
  rawDisplayCurrency?: unknown
): Promise<InvestmentSummaryResponse> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const transactions = await getAllTransactionsForDedup(portfolioId);
  const nativeTotals = computeNativeInvestmentTotals(transactions);

  const response: InvestmentSummaryResponse = {
    totalInvested: nativeTotals.totalInvested,
    totalWithdrawn: nativeTotals.totalWithdrawn,
    displayCurrency,
  };

  const lookup = await buildDisplayLookupForTransactions(transactions, displayCurrency);
  let displayTotalInvested = 0;
  let displayTotalWithdrawn = 0;
  const tickersWithBuy = new Set(
    transactions
      .filter((transaction) => transaction.transaction_type === 'BUY')
      .map((transaction) => transaction.ticker)
  );

  for (const transaction of transactions) {
    const nativeTotal = parseFloat(transaction.shares) * parseFloat(transaction.price_per_share);
    const rateDate = resolveTransactionRateDate(transaction);
    const converted = await convertAmountForDisplay(
      nativeTotal,
      transaction.currency,
      rateDate,
      displayCurrency,
      lookup
    );

    if (transaction.transaction_type === 'BUY') {
      displayTotalInvested += converted.displayAmount;
      continue;
    }

    displayTotalWithdrawn += converted.displayAmount;
    if (!tickersWithBuy.has(transaction.ticker)) {
      displayTotalInvested += converted.displayAmount;
    }
  }

  response.displayTotalInvested = roundMoney(displayTotalInvested);
  response.displayTotalWithdrawn = roundMoney(displayTotalWithdrawn);

  return response;
}

export async function createPosition(userId: string, rawDto: unknown): Promise<PositionResponse> {
  const dto = rawDto as AddPositionDto;
  dto.ticker = dto.ticker?.toUpperCase().trim();
  validateAddPositionDto(dto);

  // If the client did not send a sector (or sent "Other"), resolve it from Yahoo Finance.
  // This runs server-side so the client never has to call a separate API.
  if (!dto.sector || dto.sector === 'Other') {
    const { sector } = await getStockSector(dto.ticker);
    dto.sector = sector;
  }

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  // Always record the individual transaction for history
  await addTransaction(portfolioId, {
    ticker: dto.ticker,
    companyName: dto.companyName,
    shares: dto.shares,
    pricePerShare: dto.avgBuyPrice,
    currency: dto.currency,
    transactionDate: dto.entryDate,
    transactionType: 'BUY',
  });

  // Upsert the aggregated position (insert new or recalculate weighted avg)
  const row = await upsertPosition(portfolioId, dto);
  return mapRowToResponse(row);
}

export async function editPosition(
  userId: string,
  positionId: string,
  rawDto: unknown
): Promise<PositionResponse> {
  const dto = rawDto as UpdatePositionDto;
  validateUpdatePositionDto(dto);

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const row = await updatePosition(positionId, portfolioId, dto);
  if (!row) {
    throw new AppError(404, 'Position not found');
  }

  return mapRowToResponse(row);
}

const SHARES_EPSILON = 0.000001;

function resolveTransactionDate(tx: TransactionRow): string {
  return normalizeDbDate(tx.transaction_date) ?? tx.created_at.toISOString().slice(0, 10);
}

/**
 * Recomputes aggregated position state from the full transaction ledger for a ticker.
 * Used after removing an individual BUY so cost basis and share count stay consistent.
 */
async function syncPositionFromTransactions(portfolioId: string, ticker: string): Promise<void> {
  const transactions = await getTransactionsByTicker(portfolioId, ticker);
  const existingPosition = await getPositionByTicker(portfolioId, ticker);

  let shares = 0;
  let avgBuyPrice = 0;
  let currency = (existingPosition?.currency ?? transactions[0]?.currency ?? 'USD') as
    | 'USD'
    | 'EUR';
  let entryDate: string | null = null;

  for (const tx of transactions) {
    const txShares = parseFloat(tx.shares);
    const txPrice = parseFloat(tx.price_per_share);
    currency = tx.currency as 'USD' | 'EUR';

    if (tx.transaction_type === 'BUY') {
      const txDate = resolveTransactionDate(tx);

      if (shares <= SHARES_EPSILON) {
        avgBuyPrice = txPrice;
        entryDate = txDate;
        shares = txShares;
      } else {
        avgBuyPrice = (shares * avgBuyPrice + txShares * txPrice) / (shares + txShares);
        if (!entryDate || txDate < entryDate) {
          entryDate = txDate;
        }
        shares += txShares;
      }
    } else {
      shares -= txShares;
    }
  }

  if (shares <= SHARES_EPSILON) {
    if (existingPosition) {
      await deletePositionRowOnly(existingPosition.id, portfolioId);
    }
    return;
  }

  if (!existingPosition) {
    if (shares <= SHARES_EPSILON) {
      return;
    }

    const companyName = transactions[0]?.company_name ?? ticker;
    await insertPositionFromLedger(portfolioId, {
      ticker,
      companyName,
      shares,
      avgBuyPrice,
      currency,
      entryDate,
      sector: null,
    });
    return;
  }

  await updatePosition(existingPosition.id, portfolioId, {
    shares,
    avgBuyPrice,
    currency,
    entryDate: entryDate ?? undefined,
  });
}

export async function getBuyTransactionsForTicker(
  userId: string,
  ticker: string
): Promise<TransactionResponse[]> {
  const normalizedTicker = ticker.toUpperCase();
  if (!/^[A-Z0-9.]{1,10}$/.test(normalizedTicker)) {
    throw new AppError(400, 'Invalid ticker');
  }

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getBuyTransactionsByTicker(portfolioId, normalizedTicker);
  return rows.map(mapTransactionRowToResponse);
}

export async function removeBuyTransaction(userId: string, transactionId: string): Promise<void> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const transaction = await getTransactionById(transactionId, portfolioId);
  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }
  if (transaction.transaction_type !== 'BUY') {
    throw new AppError(400, 'Only buy transactions can be removed individually');
  }

  const deleted = await deleteTransactionById(transactionId, portfolioId);
  if (!deleted) {
    throw new AppError(404, 'Transaction not found');
  }

  await syncPositionFromTransactions(portfolioId, transaction.ticker);
}

export async function removePosition(userId: string, positionId: string): Promise<void> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const deleted = await deletePosition(positionId, portfolioId);
  if (!deleted) {
    throw new AppError(404, 'Position not found');
  }
}

/**
 * Record a sell transaction and update (or delete) the position accordingly.
 *
 * Full close  (sharesToSell === position.shares) → deletes the position row.
 * Partial close (sharesToSell < position.shares)  → reduces shares in-place.
 *
 * In both cases a SELL transaction is written to the transactions table
 * so that trade history is always complete.
 *
 * Returns the updated position (null when the position was fully closed).
 */

// ─── Helper: pick Yahoo Finance range string based on days elapsed ────────────

function rangeForDays(days: number): string {
  if (days <= 30) return '1mo';
  if (days <= 90) return '3mo';
  if (days <= 180) return '6mo';
  if (days <= 365) return '1y';
  if (days <= 730) return '2y';
  if (days <= 1825) return '5y';
  return 'max';
}

/**
 * Computes portfolio market-value history based on CURRENT POSITIONS.
 *
 * For each position we use `entry_date` (the user's stated purchase date) as
 * the start of that holding.  When `entry_date` is NULL (position added without
 * specifying a purchase date) we fall back to SIX_MONTHS_AGO so the chart
 * always shows a meaningful time-window even for brand-new users.
 *
 * Algorithm:
 *  1. Load current positions.
 *  2. Determine each position's start date (entry_date OR 6 months ago).
 *  3. Fetch daily historical closing prices from Yahoo Finance for every ticker.
 *  4. Walk every available trading day:
 *     – For each position whose start date ≤ current day:
 *         add (shares × last_known_price) to the day's portfolio value.
 *     – Record the result as an equity point if portfolio value > 0.
 *
 * This design is intentionally position-based (not transaction-based) so it
 * works reliably even when transactions lack explicit dates.  Sells are not
 * reflected — the chart shows the value of CURRENT holdings over time.
 */
export async function getPortfolioEquityHistory(
  userId: string,
  rawDisplayCurrency?: unknown
): Promise<EquityPoint[]> {
  const displayCurrency = parseDisplayCurrency(rawDisplayCurrency);
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);

  console.log(`[EquityHistory] portfolioId=${portfolioId} rows=${rows.length}`);

  if (rows.length === 0) return [];

  const todayDate = getTodayIsoDate();

  // Default start = 6 months ago (used when entry_date is NULL)
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const positionEntries = rows.map((row) => ({
    ticker: row.ticker,
    shares: parseFloat(row.shares),
    currency: row.currency,
    startDate: row.entry_date
      ? new Date(row.entry_date as unknown as string | Date).toISOString().slice(0, 10)
      : sixMonthsAgo,
  }));

  const earliestStartDate = positionEntries.map((p) => p.startDate).sort()[0];
  const daysSince = Math.ceil(
    (Date.now() - new Date(earliestStartDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Add a 30-day buffer so we always have data covering the start date
  const period = rangeForDays(daysSince + 30);

  const uniqueTickers = [...new Set(rows.map((row) => row.ticker))];

  console.log(
    `[EquityHistory] tickers=${uniqueTickers.join(',')} earliest=${earliestStartDate} period=${period}`
  );

  // Fetch historical daily closes in parallel
  const historyResults = await Promise.allSettled(
    uniqueTickers.map((ticker) => getStockHistory(ticker, period, '1d'))
  );

  // priceMaps: ticker → { YYYY-MM-DD → closingPrice }
  const priceMaps: Record<string, Record<string, number>> = {};
  historyResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const count = result.value.candles.length;
      const first = result.value.candles[0];
      const last = result.value.candles[count - 1];
      console.log(
        `[EquityHistory] ${uniqueTickers[index]}: ${count} candles, first=${first ? new Date(first.time * 1000).toISOString().slice(0, 10) : 'n/a'} last=${last ? new Date(last.time * 1000).toISOString().slice(0, 10) : 'n/a'}`
      );
      priceMaps[uniqueTickers[index]] = {};
      result.value.candles.forEach((candle) => {
        const date = new Date(candle.time * 1000).toISOString().slice(0, 10);
        priceMaps[uniqueTickers[index]][date] = candle.close;
      });
    } else {
      console.log(
        `[EquityHistory] ${uniqueTickers[index]}: FAILED – ${String((result as PromiseRejectedResult).reason)}`
      );
    }
  });

  // Collect all available trading days up to today (no lower-bound filter)
  const allDates = new Set<string>();
  Object.values(priceMaps).forEach((priceMap) => {
    Object.keys(priceMap).forEach((date) => {
      if (date <= todayDate) allDates.add(date);
    });
  });

  const sortedDates = [...allDates].sort();
  console.log(
    `[EquityHistory] allDates=${sortedDates.length} positionEntries=${JSON.stringify(positionEntries.map((p) => ({ ticker: p.ticker, startDate: p.startDate, shares: p.shares })))}`
  );
  if (sortedDates.length === 0) return [];

  const fxLookup = new Map<string, number>();
  const sourceCurrencies = [
    ...new Set(positionEntries.map((entry) => entry.currency)),
  ] as DisplayCurrency[];

  await Promise.all(
    sourceCurrencies
      .filter((sourceCurrency) => sourceCurrency !== displayCurrency)
      .map((sourceCurrency) =>
        preloadFxRates(fxLookup, sourceCurrency, displayCurrency, sortedDates)
      )
  );

  const lastKnownPrices: Record<string, number> = {};
  const equityHistory: EquityPoint[] = [];

  for (const date of sortedDates) {
    // Update last known prices (fill-forward for missing days)
    for (const ticker of uniqueTickers) {
      const price = priceMaps[ticker]?.[date];
      if (price !== undefined) lastKnownPrices[ticker] = price;
    }

    // Sum the value of every position active on this date
    let portfolioValue = 0;
    let displayPortfolioValue = 0;
    for (const { ticker, shares, startDate, currency } of positionEntries) {
      if (date >= startDate) {
        const price = lastKnownPrices[ticker];
        if (price !== undefined) {
          const nativeContribution = shares * price;
          portfolioValue += nativeContribution;

          const fxRate =
            currency === displayCurrency
              ? 1
              : await getFxRateFromLookup(fxLookup, currency, displayCurrency, date);
          displayPortfolioValue += convertWithRate(nativeContribution, fxRate);
        }
      }
    }

    if (portfolioValue > 0) {
      equityHistory.push({
        time: date,
        value: roundMoney(portfolioValue),
        displayCurrency,
        displayValue: roundMoney(displayPortfolioValue),
      });
    }
  }

  return equityHistory;
}

export async function closePosition(
  userId: string,
  positionId: string,
  rawDto: unknown
): Promise<PositionResponse | null> {
  const dto = rawDto as ClosePositionDto;

  if (typeof dto.shares !== 'number' || dto.shares <= 0 || dto.shares > MAX_SHARES) {
    throw new AppError(400, `shares must be a positive number up to ${MAX_SHARES}`);
  }
  if (
    typeof dto.pricePerShare !== 'number' ||
    dto.pricePerShare <= 0 ||
    dto.pricePerShare > MAX_PRICE
  ) {
    throw new AppError(400, `pricePerShare must be a positive number up to ${MAX_PRICE}`);
  }
  if (!ALLOWED_CURRENCIES.includes(dto.currency)) {
    throw new AppError(400, `currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`);
  }
  if (dto.saleDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dto.saleDate)) {
    throw new AppError(400, 'saleDate must be in YYYY-MM-DD format');
  }

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const position = await getPositionById(positionId, portfolioId);
  if (!position) {
    throw new AppError(404, 'Position not found');
  }

  const currentShares = parseFloat(position.shares);
  if (dto.shares > currentShares + 0.000000001) {
    throw new AppError(400, `Cannot sell ${dto.shares} shares — only ${currentShares} held`);
  }

  // Record the SELL transaction regardless of full/partial close
  await addTransaction(portfolioId, {
    ticker: position.ticker,
    companyName: position.company_name,
    shares: dto.shares,
    pricePerShare: dto.pricePerShare,
    currency: dto.currency,
    transactionDate: dto.saleDate,
    transactionType: 'SELL',
  });

  const isFullClose = Math.abs(dto.shares - currentShares) < 0.000000001;

  if (isFullClose) {
    await deletePositionRowOnly(positionId, portfolioId);
    return null;
  }

  const updatedRow = await reducePositionShares(positionId, portfolioId, dto.shares);
  if (!updatedRow) {
    throw new AppError(500, 'Failed to update position');
  }

  return mapRowToResponse(updatedRow);
}

export async function confirmImportedTrades(
  userId: string,
  broker: SupportedBrokerId,
  trades: NormalizedTrade[]
): Promise<ImportConfirmResponse> {
  void broker;

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const existingTransactions = await getAllTransactionsForDedup(portfolioId);

  const existingFingerprints = new Set(
    existingTransactions.map((transaction) =>
      buildTradeFingerprint({
        ticker: transaction.ticker,
        transactionDate:
          normalizeDbDate(transaction.transaction_date) ??
          transaction.created_at.toISOString().slice(0, 10),
        transactionType: transaction.transaction_type,
        shares: Number.parseFloat(transaction.shares),
        pricePerShare: Number.parseFloat(transaction.price_per_share),
      })
    )
  );

  let importedCount = 0;
  let skippedDuplicateCount = 0;
  const affectedTickers = new Set<string>();

  for (const trade of trades) {
    const fingerprint = buildTradeFingerprint(trade);
    if (existingFingerprints.has(fingerprint)) {
      skippedDuplicateCount += 1;
      continue;
    }

    await addTransaction(portfolioId, {
      ticker: trade.ticker,
      companyName: trade.companyName,
      shares: trade.shares,
      pricePerShare: trade.pricePerShare,
      currency: trade.currency as 'USD' | 'EUR',
      transactionDate: trade.transactionDate,
      transactionType: trade.transactionType,
    });

    existingFingerprints.add(fingerprint);
    affectedTickers.add(trade.ticker);
    importedCount += 1;
  }

  for (const ticker of affectedTickers) {
    await syncPositionFromTransactions(portfolioId, ticker);

    const position = await getPositionByTicker(portfolioId, ticker);
    if (position && !position.sector) {
      const { sector } = await getStockSector(ticker);
      await updatePositionSector(position.id, portfolioId, sector);
    }
  }

  return {
    importedCount,
    skippedDuplicateCount,
    affectedTickers: [...affectedTickers].sort(),
  };
}
