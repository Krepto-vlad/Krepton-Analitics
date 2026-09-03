/**
 * Migration: watchlist_items
 *
 * Stores tickers a user wants to monitor. Linked to portfolio_accounts via
 * portfolio_id (HMAC owner_token indirection) — never to users directly.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('watchlist_items', {
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
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('watchlist_items', 'portfolio_id');

  pgm.addConstraint('watchlist_items', 'watchlist_items_portfolio_ticker_unique', {
    unique: ['portfolio_id', 'ticker'],
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('watchlist_items');
};
