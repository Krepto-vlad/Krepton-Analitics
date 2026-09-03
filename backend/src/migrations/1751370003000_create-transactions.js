/**
 * Migration: transactions table
 *
 * Stores individual buy/sell events separately from the aggregated positions.
 * positions = current aggregated state (total shares, weighted avg price)
 * transactions = immutable history of every individual trade
 *
 * This separation allows:
 *   - Showing trade history on the portfolio chart (entry markers)
 *   - Correct P&L attribution per lot
 *   - Future tax reporting features
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('transactions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    portfolio_id: {
      type: 'uuid',
      notNull: true,
      references: '"portfolio_accounts"',
      onDelete: 'CASCADE',
    },
    ticker: {
      type: 'varchar(10)',
      notNull: true,
    },
    company_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    shares: {
      type: 'numeric(18,8)',
      notNull: true,
    },
    price_per_share: {
      type: 'numeric(18,8)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'USD',
    },
    transaction_date: {
      type: 'date',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('transactions', 'portfolio_id');
  pgm.createIndex('transactions', ['portfolio_id', 'ticker']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('transactions');
};
