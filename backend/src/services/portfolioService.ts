import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { getStockSector, getStockHistory } from './stockService.js';
import {
  findOrCreatePortfolioAccount,
  getPositionsByPortfolioId,
  getPositionsByPortfolioIdPaginated,
  countPositionsByPortfolioId,
  getTransactionsByPortfolioIdPaginated,
  countTransactionsByPortfolioId,
  getInvestmentTotals,
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
import {
  COMPANY_NAME_MAX_LENGTH,
  MAX_SHARES,
  MAX_PRICE,
  ALLOWED_CURRENCIES,
  HOLDINGS_PAGE_SIZE,
  TRANSACTIONS_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants.js';

// ─── HMAC indirection ─────────────────────────────────────────────────────────

/**
 * Derives a portfolio owner token from the user's UUID.
 *
 * HMAC-SHA256(userId, PORTFOLIO_SECRET) produces a 64-char hex string that:
 *   - Is deterministic: same userId + same secret = same token (idempotent lookup)
 *   - Is one-way: you cannot reverse it to find the userId without the secret
 *   - Is stored in portfolio_accounts instead of the user's UUID
 *
 * Therefore the DB never holds a direct mapping between a user email and their
 * portfolio positions. An attacker who dumps the DB cannot link them without
 * also having access to the server's PORTFOLIO_SECRET environment variable.
 */
function computeOwnerToken(userId: string): string {
  return createHmac('sha256', env.portfolioSecret).update(userId).digest('hex');
}

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

// ─── Service functions ────────────────────────────────────────────────────────

export async function getUserPositions(userId: string): Promise<PositionResponse[]> {
  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);
  const enrichedRows = await enrichPositionsWithSectors(portfolioId, rows);
  return enrichedRows.map(mapRowToResponse);
}

export async function getUserPositionsPaginated(
  userId: string,
  rawLimit: unknown,
  rawOffset: unknown
): Promise<PaginatedResponse<PositionResponse>> {
  const { limit, offset } = parsePaginationParams(rawLimit, rawOffset, HOLDINGS_PAGE_SIZE);
  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const [rows, total] = await Promise.all([
    getPositionsByPortfolioIdPaginated(portfolioId, limit, offset),
    countPositionsByPortfolioId(portfolioId),
  ]);

  const enrichedRows = await enrichPositionsWithSectors(portfolioId, rows);
  const items = enrichedRows.map(mapRowToResponse);

  return buildPaginatedResponse(items, total, limit, offset);
}

export async function getUserTransactionsPaginated(
  userId: string,
  rawLimit: unknown,
  rawOffset: unknown
): Promise<PaginatedResponse<TransactionResponse>> {
  const { limit, offset } = parsePaginationParams(rawLimit, rawOffset, TRANSACTIONS_PAGE_SIZE);
  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const [rows, total] = await Promise.all([
    getTransactionsByPortfolioIdPaginated(portfolioId, limit, offset),
    countTransactionsByPortfolioId(portfolioId),
  ]);

  const items = rows.map(mapTransactionRowToResponse);
  return buildPaginatedResponse(items, total, limit, offset);
}

export async function getInvestmentSummary(userId: string): Promise<InvestmentSummaryResponse> {
  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const totals = await getInvestmentTotals(portfolioId);

  return {
    totalInvested: totals.totalInvested,
    totalWithdrawn: totals.totalWithdrawn,
  };
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

  const ownerToken = computeOwnerToken(userId);
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

  const ownerToken = computeOwnerToken(userId);
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

  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getBuyTransactionsByTicker(portfolioId, normalizedTicker);
  return rows.map(mapTransactionRowToResponse);
}

export async function removeBuyTransaction(userId: string, transactionId: string): Promise<void> {
  const ownerToken = computeOwnerToken(userId);
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
  const ownerToken = computeOwnerToken(userId);
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
export async function getPortfolioEquityHistory(userId: string): Promise<EquityPoint[]> {
  const ownerToken = computeOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getPositionsByPortfolioId(portfolioId);

  console.log(`[EquityHistory] portfolioId=${portfolioId} rows=${rows.length}`);

  if (rows.length === 0) return [];

  const todayDate = new Date().toISOString().slice(0, 10);

  // Default start = 6 months ago (used when entry_date is NULL)
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const positionEntries = rows.map((row) => ({
    ticker: row.ticker,
    shares: parseFloat(row.shares),
    // Normalize to YYYY-MM-DD regardless of how pg returns the DATE column
    // (pg may return a Date object, an ISO datetime string, or a plain date string).
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
    for (const { ticker, shares, startDate } of positionEntries) {
      if (date >= startDate) {
        const price = lastKnownPrices[ticker];
        if (price !== undefined) {
          portfolioValue += shares * price;
        }
      }
    }

    if (portfolioValue > 0) {
      equityHistory.push({ time: date, value: Math.round(portfolioValue * 100) / 100 });
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

  const ownerToken = computeOwnerToken(userId);
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
