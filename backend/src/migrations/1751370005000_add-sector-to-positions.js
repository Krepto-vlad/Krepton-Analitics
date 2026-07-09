/**
 * Migration: add sector column to positions table.
 *
 * Stores the GICS sector (e.g. "Technology", "Financials") fetched from
 * Yahoo Finance at the time the position is added. This avoids repeated
 * API calls every time the portfolio is loaded.
 *
 * Nullable — older rows and tickers without Yahoo assetProfile data default to NULL.
 * Frontend treats NULL as "Other" for display purposes.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('positions', {
    sector: {
      type: 'varchar(100)',
      notNull: false,
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('positions', 'sector');
};
