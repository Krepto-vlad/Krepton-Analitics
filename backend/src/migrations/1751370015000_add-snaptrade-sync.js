/**
 * SnapTrade user secrets (server-only) and ledger source for snapshot resync.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('snaptrade_users', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    snaptrade_user_id: {
      type: 'varchar(128)',
      notNull: true,
      unique: true,
    },
    user_secret: {
      type: 'varchar(256)',
      notNull: true,
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

  pgm.addColumn('transactions', {
    source: {
      type: 'varchar(32)',
      notNull: true,
      default: 'unknown',
    },
  });

  pgm.addConstraint('transactions', 'transactions_source_check', {
    check: "source IN ('unknown', 'manual', 'import', 'snaptrade')",
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('transactions', 'transactions_source_check');
  pgm.dropColumn('transactions', 'source');
  pgm.dropTable('snaptrade_users');
};
