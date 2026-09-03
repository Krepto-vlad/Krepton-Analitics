/**
 * Migration: portfolio_accounts + positions
 *
 * Security design:
 *   portfolio_accounts.owner_token = HMAC-SHA256(user_id, PORTFOLIO_SECRET)
 *
 *   There is intentionally NO foreign key from portfolio_accounts to users.
 *   Even if an attacker dumps the entire database, they cannot link a
 *   position row to a user row without knowing the PORTFOLIO_SECRET
 *   environment variable (which lives only on the server, never in the DB).
 *
 *   Attack surface comparison:
 *     Without this pattern → join users + portfolio_positions on user_id → full deanonymisation
 *     With this pattern    → see opaque HMAC tokens + random UUIDs → no user linkage
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Intermediate table: maps an opaque HMAC token to a portfolio UUID.
  // No FK to users — deliberate.
  pgm.createTable('portfolio_accounts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    // HMAC-SHA256(user_id, PORTFOLIO_SECRET) — 64 hex chars, not reversible without the secret.
    owner_token: {
      type: 'char(64)',
      notNull: true,
      unique: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('portfolio_accounts', 'owner_token');

  // Positions are linked only to portfolio_accounts, never to users directly.
  pgm.createTable('positions', {
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
    avg_buy_price: {
      type: 'numeric(18,8)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      notNull: true,
      default: 'USD',
    },
    entry_date: {
      type: 'date',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('positions', 'portfolio_id');

  // Prevent duplicate ticker per portfolio (one row per stock per account)
  pgm.addConstraint('positions', 'positions_portfolio_ticker_unique', {
    unique: ['portfolio_id', 'ticker'],
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('positions');
  pgm.dropTable('portfolio_accounts');
};
