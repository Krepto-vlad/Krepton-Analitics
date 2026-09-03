import { AppError } from '../middleware/errorHandler.js';
import { findOrCreatePortfolioAccount } from '../repositories/portfolioRepository.js';
import {
  getWatchlistByPortfolioId,
  countWatchlistByPortfolioId,
  insertWatchlistItem,
  deleteWatchlistItem,
  getWatchlistItemByTicker,
} from '../repositories/watchlistRepository.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import type {
  AddWatchlistItemDto,
  WatchlistItemResponse,
  WatchlistItemRow,
} from '../types/watchlist.types.js';
import { TICKER_MAX_LENGTH, COMPANY_NAME_MAX_LENGTH, MAX_WATCHLIST_ITEMS } from '../constants.js';
import { isValidTickerSymbol, TICKER_FORMAT_ERROR_MESSAGE } from '../utils/tickerValidation.js';

function mapRowToResponse(row: WatchlistItemRow): WatchlistItemResponse {
  return {
    id: row.id,
    ticker: row.ticker,
    companyName: row.company_name,
    createdAt: row.created_at.toISOString(),
  };
}

function validateAddWatchlistItemDto(dto: AddWatchlistItemDto): void {
  if (!dto.ticker || typeof dto.ticker !== 'string') {
    throw new AppError(400, 'ticker is required');
  }
  if (!isValidTickerSymbol(dto.ticker)) {
    throw new AppError(400, TICKER_FORMAT_ERROR_MESSAGE);
  }
  if (dto.ticker.length > TICKER_MAX_LENGTH) {
    throw new AppError(400, `ticker must be at most ${TICKER_MAX_LENGTH} characters`);
  }
  if (!dto.companyName || typeof dto.companyName !== 'string') {
    throw new AppError(400, 'companyName is required');
  }
  if (dto.companyName.length > COMPANY_NAME_MAX_LENGTH) {
    throw new AppError(400, `companyName must be at most ${COMPANY_NAME_MAX_LENGTH} characters`);
  }
}

export async function getUserWatchlist(userId: string): Promise<WatchlistItemResponse[]> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const rows = await getWatchlistByPortfolioId(portfolioId);
  return rows.map(mapRowToResponse);
}

export async function addWatchlistItem(
  userId: string,
  rawDto: unknown
): Promise<WatchlistItemResponse> {
  const dto = rawDto as AddWatchlistItemDto;
  dto.ticker = dto.ticker?.toUpperCase().trim();
  validateAddWatchlistItemDto(dto);

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const existing = await getWatchlistItemByTicker(portfolioId, dto.ticker);
  if (existing) {
    throw new AppError(409, `${dto.ticker} is already in your watchlist`);
  }

  const count = await countWatchlistByPortfolioId(portfolioId);
  if (count >= MAX_WATCHLIST_ITEMS) {
    throw new AppError(400, `Watchlist cannot exceed ${MAX_WATCHLIST_ITEMS} items`);
  }

  const row = await insertWatchlistItem(portfolioId, dto.ticker, dto.companyName.trim());
  return mapRowToResponse(row);
}

export async function removeWatchlistItem(userId: string, itemId: string): Promise<void> {
  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);

  const deleted = await deleteWatchlistItem(itemId, portfolioId);
  if (!deleted) {
    throw new AppError(404, 'Watchlist item not found');
  }
}
