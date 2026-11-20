/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const up = (pgm) => {
  pgm.addColumn('portfolio_accounts', {
    rebalancing_include_permanent_cash: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
export const down = (pgm) => {
  pgm.dropColumn('portfolio_accounts', 'rebalancing_include_permanent_cash');
};
