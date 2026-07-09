/**
 * Migration: add transaction_type to transactions table.
 *
 * Distinguishes BUY entries (from addPosition) from SELL entries (from closePosition).
 * Existing rows are backfilled as 'BUY'.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('transactions', {
    transaction_type: {
      type: 'varchar(4)',
      notNull: true,
      default: 'BUY',
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('transactions', 'transaction_type');
};
