import { pool } from '../config/db.js';
import type { WatchlistItemRow } from '../types/watchlist.types.js';

export async function getWatchlistByPortfolioId(portfolioId: string): Promise<WatchlistItemRow[]> {
  const result = await pool.query<WatchlistItemRow>(
    `SELECT id, portfolio_id, ticker, company_name, created_at
     FROM watchlist_items
     WHERE portfolio_id = $1
     ORDER BY created_at ASC`,
    [portfolioId]
  );

  return result.rows;
}

export async function countWatchlistByPortfolioId(portfolioId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM watchlist_items WHERE portfolio_id = $1',
    [portfolioId]
  );

  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function insertWatchlistItem(
  portfolioId: string,
  ticker: string,
  companyName: string
): Promise<WatchlistItemRow> {
  const result = await pool.query<WatchlistItemRow>(
    `INSERT INTO watchlist_items (portfolio_id, ticker, company_name)
     VALUES ($1, $2, $3)
     RETURNING id, portfolio_id, ticker, company_name, created_at`,
    [portfolioId, ticker, companyName]
  );

  return result.rows[0];
}

export async function deleteWatchlistItem(itemId: string, portfolioId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM watchlist_items WHERE id = $1 AND portfolio_id = $2',
    [itemId, portfolioId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getWatchlistItemByTicker(
  portfolioId: string,
  ticker: string
): Promise<WatchlistItemRow | null> {
  const result = await pool.query<WatchlistItemRow>(
    `SELECT id, portfolio_id, ticker, company_name, created_at
     FROM watchlist_items
     WHERE portfolio_id = $1 AND ticker = $2`,
    [portfolioId, ticker]
  );

  return result.rows[0] ?? null;
}
