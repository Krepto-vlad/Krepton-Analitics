import { pool } from '../config/db.js';
import type {
  PortfolioAccountRow,
  PositionRow,
  TransactionRow,
  AddPositionDto,
  UpdatePositionDto,
} from '../types/portfolio.types.js';

// ─── Transaction params ───────────────────────────────────────────────────────

interface AddTransactionParams {
  ticker: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  currency: string;
  transactionDate?: string;
  transactionType: 'BUY' | 'SELL';
}

/**
 * Find an existing portfolio account by its owner token, or create one.
 * Returns the portfolio's UUID (used as a FK for positions).
 *
 * The owner_token is never the user's actual UUID — it is an HMAC derived
 * in the service layer, so this repository never touches user identity.
 */
export async function findOrCreatePortfolioAccount(ownerToken: string): Promise<string> {
  const existing = await pool.query<PortfolioAccountRow>(
    'SELECT id FROM portfolio_accounts WHERE owner_token = $1',
    [ownerToken]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await pool.query<PortfolioAccountRow>(
    'INSERT INTO portfolio_accounts (owner_token) VALUES ($1) RETURNING id',
    [ownerToken]
  );

  return created.rows[0].id;
}

export async function getPositionsByPortfolioId(portfolioId: string): Promise<PositionRow[]> {
  const result = await pool.query<PositionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, avg_buy_price,
            currency, sector, entry_date, created_at, updated_at
     FROM positions
     WHERE portfolio_id = $1
     ORDER BY created_at ASC`,
    [portfolioId]
  );

  return result.rows;
}

export async function countPositionsByPortfolioId(portfolioId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM positions WHERE portfolio_id = $1',
    [portfolioId]
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function getPositionsByPortfolioIdPaginated(
  portfolioId: string,
  limit: number,
  offset: number
): Promise<PositionRow[]> {
  const result = await pool.query<PositionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, avg_buy_price,
            currency, sector, entry_date, created_at, updated_at
     FROM positions
     WHERE portfolio_id = $1
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [portfolioId, limit, offset]
  );

  return result.rows;
}

/**
 * Insert or update a position for a given ticker within a portfolio.
 *
 * On insert:   stores shares + avg_buy_price as-is.
 * On conflict: recalculates the weighted average price across all buys and
 *              adds the new shares to the existing total. The entry_date is
 *              preserved from the very first buy.
 *
 * The weighted average formula (executed entirely in SQL to avoid rounding issues):
 *   new_avg = (old_shares × old_avg + new_shares × new_price) / (old_shares + new_shares)
 */
export async function upsertPosition(
  portfolioId: string,
  dto: AddPositionDto
): Promise<PositionRow> {
  const result = await pool.query<PositionRow>(
    `INSERT INTO positions
       (portfolio_id, ticker, company_name, shares, avg_buy_price, currency, entry_date, sector)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT ON CONSTRAINT positions_portfolio_ticker_unique
     DO UPDATE SET
       avg_buy_price = (positions.shares * positions.avg_buy_price + EXCLUDED.shares * EXCLUDED.avg_buy_price)
                       / (positions.shares + EXCLUDED.shares),
       shares        = positions.shares + EXCLUDED.shares,
       company_name  = EXCLUDED.company_name,
       sector        = COALESCE(EXCLUDED.sector, positions.sector),
       updated_at    = NOW()
     RETURNING *`,
    [
      portfolioId,
      dto.ticker,
      dto.companyName,
      dto.shares,
      dto.avgBuyPrice,
      dto.currency,
      dto.entryDate ?? null,
      dto.sector ?? null,
    ]
  );

  return result.rows[0];
}

export async function addTransaction(
  portfolioId: string,
  params: AddTransactionParams
): Promise<TransactionRow> {
  const result = await pool.query<TransactionRow>(
    `INSERT INTO transactions
       (portfolio_id, ticker, company_name, shares, price_per_share, currency,
        transaction_date, transaction_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      portfolioId,
      params.ticker,
      params.companyName,
      params.shares,
      params.pricePerShare,
      params.currency,
      params.transactionDate ?? null,
      params.transactionType,
    ]
  );

  return result.rows[0];
}

export async function getPositionByTicker(
  portfolioId: string,
  ticker: string
): Promise<PositionRow | null> {
  const result = await pool.query<PositionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, avg_buy_price,
            currency, sector, entry_date, created_at, updated_at
     FROM positions
     WHERE portfolio_id = $1 AND ticker = $2`,
    [portfolioId, ticker]
  );
  return result.rows[0] ?? null;
}

export async function deletePositionRowOnly(
  positionId: string,
  portfolioId: string
): Promise<boolean> {
  const result = await pool.query('DELETE FROM positions WHERE id = $1 AND portfolio_id = $2', [
    positionId,
    portfolioId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function getPositionById(
  positionId: string,
  portfolioId: string
): Promise<PositionRow | null> {
  const result = await pool.query<PositionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, avg_buy_price,
            currency, sector, entry_date, created_at, updated_at
     FROM positions
     WHERE id = $1 AND portfolio_id = $2`,
    [positionId, portfolioId]
  );

  return result.rows[0] ?? null;
}

/**
 * Reduce shares on a position (partial sell).
 * avg_buy_price is intentionally NOT changed — cost basis stays fixed.
 * Returns the updated row, or null if the position was not found.
 */
export async function reducePositionShares(
  positionId: string,
  portfolioId: string,
  sharesToSell: number
): Promise<PositionRow | null> {
  const result = await pool.query<PositionRow>(
    `UPDATE positions
     SET shares     = shares - $1,
         updated_at = NOW()
     WHERE id = $2 AND portfolio_id = $3
     RETURNING *`,
    [sharesToSell, positionId, portfolioId]
  );

  return result.rows[0] ?? null;
}

export async function updatePosition(
  positionId: string,
  portfolioId: string,
  dto: UpdatePositionDto
): Promise<PositionRow | null> {
  // Build SET clause dynamically — only update provided fields
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (dto.shares !== undefined) {
    setClauses.push(`shares = $${paramIndex++}`);
    values.push(dto.shares);
  }
  if (dto.avgBuyPrice !== undefined) {
    setClauses.push(`avg_buy_price = $${paramIndex++}`);
    values.push(dto.avgBuyPrice);
  }
  if (dto.currency !== undefined) {
    setClauses.push(`currency = $${paramIndex++}`);
    values.push(dto.currency);
  }
  if (dto.entryDate !== undefined) {
    setClauses.push(`entry_date = $${paramIndex++}`);
    values.push(dto.entryDate);
  }

  // Always check portfolio ownership in the WHERE clause (prevents IDOR)
  values.push(positionId);
  values.push(portfolioId);

  const result = await pool.query<PositionRow>(
    `UPDATE positions
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex++} AND portfolio_id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
}

/**
 * Deletes a position and its BUY transaction history for the same ticker.
 * SELL records are preserved — they represent real sales via Close Position.
 *
 * Used only for explicit "delete position" (mistake correction), NOT for full close via sell.
 */
export async function deletePosition(positionId: string, portfolioId: string): Promise<boolean> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const positionResult = await client.query<{ ticker: string }>(
      'SELECT ticker FROM positions WHERE id = $1 AND portfolio_id = $2',
      [positionId, portfolioId]
    );

    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const ticker = positionResult.rows[0].ticker;

    await client.query(
      `DELETE FROM transactions
       WHERE portfolio_id = $1 AND ticker = $2 AND transaction_type = 'BUY'`,
      [portfolioId, ticker]
    );

    await client.query('DELETE FROM positions WHERE id = $1 AND portfolio_id = $2', [
      positionId,
      portfolioId,
    ]);

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getTransactionById(
  transactionId: string,
  portfolioId: string
): Promise<TransactionRow | null> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE id = $1 AND portfolio_id = $2`,
    [transactionId, portfolioId]
  );
  return result.rows[0] ?? null;
}

export async function getTransactionsByTicker(
  portfolioId: string,
  ticker: string
): Promise<TransactionRow[]> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE portfolio_id = $1 AND ticker = $2
     ORDER BY COALESCE(transaction_date, created_at::date) ASC, created_at ASC`,
    [portfolioId, ticker]
  );
  return result.rows;
}

export async function getBuyTransactionsByTicker(
  portfolioId: string,
  ticker: string
): Promise<TransactionRow[]> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE portfolio_id = $1 AND ticker = $2 AND transaction_type = 'BUY'
     ORDER BY COALESCE(transaction_date, created_at::date) DESC, created_at DESC`,
    [portfolioId, ticker]
  );
  return result.rows;
}

export async function deleteTransactionById(
  transactionId: string,
  portfolioId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM transactions
     WHERE id = $1 AND portfolio_id = $2 AND transaction_type = 'BUY'`,
    [transactionId, portfolioId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Returns all transactions for a portfolio sorted chronologically (ascending).
 * Used to reconstruct portfolio value over time.
 */
export async function getTransactionHistory(portfolioId: string): Promise<TransactionRow[]> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE portfolio_id = $1
     ORDER BY COALESCE(transaction_date, created_at::date) ASC, created_at ASC`,
    [portfolioId]
  );
  return result.rows;
}

export async function getInvestmentTotals(
  portfolioId: string
): Promise<{ totalInvested: number; totalWithdrawn: number }> {
  const result = await pool.query<{
    total_invested: string;
    total_withdrawn: string;
  }>(
    `WITH buy_total AS (
       SELECT COALESCE(SUM(shares * price_per_share), 0) AS amount
       FROM transactions
       WHERE portfolio_id = $1 AND transaction_type = 'BUY'
     ),
     sell_total AS (
       SELECT COALESCE(SUM(shares * price_per_share), 0) AS amount
       FROM transactions
       WHERE portfolio_id = $1 AND transaction_type = 'SELL'
     ),
     orphaned_sell_total AS (
       SELECT COALESCE(SUM(t.shares * t.price_per_share), 0) AS amount
       FROM transactions t
       WHERE t.portfolio_id = $1
         AND t.transaction_type = 'SELL'
         AND NOT EXISTS (
           SELECT 1
           FROM transactions b
           WHERE b.portfolio_id = t.portfolio_id
             AND b.ticker = t.ticker
             AND b.transaction_type = 'BUY'
         )
     )
     SELECT
       (buy_total.amount + orphaned_sell_total.amount)::text AS total_invested,
       sell_total.amount::text AS total_withdrawn
     FROM buy_total, sell_total, orphaned_sell_total`,
    [portfolioId]
  );

  const row = result.rows[0];
  return {
    totalInvested: parseFloat(row?.total_invested ?? '0'),
    totalWithdrawn: parseFloat(row?.total_withdrawn ?? '0'),
  };
}

export async function countTransactionsByPortfolioId(portfolioId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM transactions WHERE portfolio_id = $1',
    [portfolioId]
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

/**
 * Returns paginated transactions sorted by user-entered date (newest first).
 */
export async function getTransactionsByPortfolioIdPaginated(
  portfolioId: string,
  limit: number,
  offset: number
): Promise<TransactionRow[]> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE portfolio_id = $1
     ORDER BY COALESCE(transaction_date, created_at::date) DESC, created_at DESC
     LIMIT $2 OFFSET $3`,
    [portfolioId, limit, offset]
  );
  return result.rows;
}

export async function getAllTransactionsForDedup(portfolioId: string): Promise<TransactionRow[]> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, portfolio_id, ticker, company_name, shares, price_per_share,
            currency, transaction_date, transaction_type, created_at
     FROM transactions
     WHERE portfolio_id = $1`,
    [portfolioId]
  );

  return result.rows;
}

export async function insertPositionFromLedger(
  portfolioId: string,
  params: {
    ticker: string;
    companyName: string;
    shares: number;
    avgBuyPrice: number;
    currency: string;
    entryDate: string | null;
    sector?: string | null;
  }
): Promise<PositionRow> {
  const result = await pool.query<PositionRow>(
    `INSERT INTO positions
       (portfolio_id, ticker, company_name, shares, avg_buy_price, currency, entry_date, sector)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      portfolioId,
      params.ticker,
      params.companyName,
      params.shares,
      params.avgBuyPrice,
      params.currency,
      params.entryDate,
      params.sector ?? null,
    ]
  );

  return result.rows[0];
}

/**
 * Backfill a single position's sector.
 * Called fire-and-forget when getUserPositions detects null sectors.
 * portfolioId guard prevents IDOR.
 */
export async function updatePositionSector(
  positionId: string,
  portfolioId: string,
  sector: string
): Promise<void> {
  await pool.query(
    'UPDATE positions SET sector = $1, updated_at = NOW() WHERE id = $2 AND portfolio_id = $3',
    [sector, positionId, portfolioId]
  );
}

export async function getPortfolioRebalancingStrategy(portfolioId: string): Promise<{
  strategyId: string;
  customBaseStrategyId: string | null;
  customAllocations: Record<string, number> | null;
}> {
  const result = await pool.query<PortfolioAccountRow>(
    `SELECT rebalancing_strategy_id, rebalancing_custom_base_strategy_id, rebalancing_custom_allocations
     FROM portfolio_accounts
     WHERE id = $1`,
    [portfolioId]
  );

  if (result.rows.length === 0) {
    throw new Error('Portfolio account not found');
  }

  const row = result.rows[0];

  return {
    strategyId: row.rebalancing_strategy_id ?? 'ray-dalio-all-weather',
    customBaseStrategyId: row.rebalancing_custom_base_strategy_id ?? null,
    customAllocations: row.rebalancing_custom_allocations ?? null,
  };
}

export async function updatePortfolioRebalancingStrategy(
  portfolioId: string,
  update: {
    strategyId: string;
    customBaseStrategyId?: string | null;
    customAllocations?: Record<string, number> | null;
  }
): Promise<void> {
  if (update.strategyId === 'custom' && update.customAllocations !== undefined) {
    await pool.query(
      `UPDATE portfolio_accounts
       SET rebalancing_strategy_id = $1,
           rebalancing_custom_base_strategy_id = $2,
           rebalancing_custom_allocations = $3
       WHERE id = $4`,
      [
        update.strategyId,
        update.customBaseStrategyId ?? null,
        update.customAllocations ?? null,
        portfolioId,
      ]
    );
    return;
  }

  if (update.strategyId === 'custom') {
    await pool.query(
      `UPDATE portfolio_accounts
       SET rebalancing_strategy_id = $1
       WHERE id = $2`,
      [update.strategyId, portfolioId]
    );
    return;
  }

  await pool.query(
    `UPDATE portfolio_accounts
     SET rebalancing_strategy_id = $1
     WHERE id = $2`,
    [update.strategyId, portfolioId]
  );
}
