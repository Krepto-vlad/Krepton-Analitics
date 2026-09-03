import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { watchlistItems } from '../db/schema.js';
import type { WatchlistItemRow } from '../types/watchlist.types.js';

const WATCHLIST_ITEM_COLUMNS = {
  id: watchlistItems.id,
  portfolio_id: watchlistItems.portfolio_id,
  ticker: watchlistItems.ticker,
  company_name: watchlistItems.company_name,
  created_at: watchlistItems.created_at,
} as const;

export async function getWatchlistByPortfolioId(portfolioId: string): Promise<WatchlistItemRow[]> {
  return db
    .select(WATCHLIST_ITEM_COLUMNS)
    .from(watchlistItems)
    .where(eq(watchlistItems.portfolio_id, portfolioId))
    .orderBy(asc(watchlistItems.created_at));
}

export async function countWatchlistByPortfolioId(portfolioId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(watchlistItems)
    .where(eq(watchlistItems.portfolio_id, portfolioId));
  return Number(rows[0]?.value ?? 0);
}

export async function insertWatchlistItem(
  portfolioId: string,
  ticker: string,
  companyName: string
): Promise<WatchlistItemRow> {
  const rows = await db
    .insert(watchlistItems)
    .values({
      portfolio_id: portfolioId,
      ticker,
      company_name: companyName,
    })
    .returning(WATCHLIST_ITEM_COLUMNS);
  return rows[0];
}

export async function deleteWatchlistItem(itemId: string, portfolioId: string): Promise<boolean> {
  const rows = await db
    .delete(watchlistItems)
    .where(and(eq(watchlistItems.id, itemId), eq(watchlistItems.portfolio_id, portfolioId)))
    .returning({ id: watchlistItems.id });
  return rows.length > 0;
}

export async function getWatchlistItemByTicker(
  portfolioId: string,
  ticker: string
): Promise<WatchlistItemRow | null> {
  const rows = await db
    .select(WATCHLIST_ITEM_COLUMNS)
    .from(watchlistItems)
    .where(and(eq(watchlistItems.portfolio_id, portfolioId), eq(watchlistItems.ticker, ticker)))
    .limit(1);
  return rows[0] ?? null;
}
